from __future__ import annotations

import contextlib
import hashlib
import io
import json
import os
import plistlib
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import appstate
from appstate import COUNT_KEY, SignInError, auth_key, get_item, set_item, storage_dir, user_record

RESP = {"localId": "u1", "email": "a@b.c", "idToken": "tok-id-123",
        "refreshToken": "tok-refresh-456", "expiresIn": "3600"}
EMBEDDED = "aaaaaaaa-0000-0000-0000-000000000001"
NEWER = "bbbbbbbb-0000-0000-0000-000000000002"


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def manifest(folder: Path) -> dict:
    return json.loads((folder / "manifest.json").read_text(encoding="utf-8"))


class StorageTests(unittest.TestCase):
    def setUp(self):
        self._t = tempfile.TemporaryDirectory()
        self.addCleanup(self._t.cleanup)
        self.f = Path(self._t.name)

    def test_small_value_inlined(self):
        set_item(self.f, "k", "v")
        self.assertEqual(manifest(self.f), {"k": "v"})
        self.assertEqual([p.name for p in self.f.iterdir()], ["manifest.json"])

    def test_big_value_in_md5_file(self):
        big = "x" * 1025
        set_item(self.f, "k", big)
        self.assertEqual(manifest(self.f), {"k": None})
        md5 = self.f / hashlib.md5(b"k").hexdigest()
        self.assertEqual(md5.read_text(encoding="utf-8"), big)
        self.assertEqual(get_item(self.f, "k"), big)

    def test_big_then_small_removes_file(self):
        set_item(self.f, "k", "x" * 1025)
        set_item(self.f, "k", "v")
        self.assertEqual(manifest(self.f), {"k": "v"})
        self.assertFalse((self.f / hashlib.md5(b"k").hexdigest()).exists())

    def test_missing_manifest_created(self):
        data = self.f / "data"
        set_item(storage_dir(data), COUNT_KEY, "10")
        self.assertEqual(manifest(storage_dir(data)), {COUNT_KEY: "10"})

    def test_keeps_other_keys(self):
        set_item(self.f, COUNT_KEY, "11")
        set_item(self.f, auth_key("AIza"), "{}")
        self.assertEqual(manifest(self.f), {COUNT_KEY: "11", auth_key("AIza"): "{}"})

    def test_get_missing(self):
        self.assertIsNone(get_item(self.f, "nope"))


class RecordTests(unittest.TestCase):
    def test_auth_key(self):
        self.assertEqual(auth_key("AIza"), "firebase:authUser:AIza:[DEFAULT]")

    def test_user_record_fields(self):
        r = user_record(RESP, "AIza", 1000)
        self.assertEqual(r["uid"], "u1")
        self.assertEqual(r["email"], "a@b.c")
        self.assertIs(r["emailVerified"], False)
        self.assertIs(r["isAnonymous"], False)
        self.assertEqual(r["providerData"], [{"providerId": "password", "uid": "a@b.c",
                                              "displayName": None, "email": "a@b.c",
                                              "phoneNumber": None, "photoURL": None}])
        self.assertEqual(r["stsTokenManager"], {"refreshToken": "tok-refresh-456",
                                                "accessToken": "tok-id-123",
                                                "expirationTime": 3601000})
        self.assertEqual(r["apiKey"], "AIza")
        self.assertEqual(r["appName"], "[DEFAULT]")


class SessionTests(unittest.TestCase):
    def setUp(self):
        self._t = tempfile.TemporaryDirectory()
        self.addCleanup(self._t.cleanup)
        root = Path(self._t.name)
        self.data, self.app, self.status = root / "data", root / "App.app", root / "status.txt"
        write(self.app / "EXConstants.bundle" / "app.config",
              json.dumps({"extra": {"firebase": {"apiKey": "AIza"}}}))

    def run_session(self, env):
        out = io.StringIO()
        with mock.patch.dict(os.environ, env), contextlib.redirect_stdout(out):
            code = appstate.main(["session", str(self.data), str(self.app), str(self.status)])
        return code, out.getvalue().splitlines()

    def test_session_masks_tokens(self):
        env = {"DUO_TEST_EMAIL": "a@b.c", "DUO_TEST_PASSWORD": "pw"}
        with mock.patch.object(appstate, "sign_in", return_value=RESP):
            code, lines = self.run_session(env)
        self.assertEqual(code, 0)
        self.assertEqual(lines[:2], ["::add-mask::tok-id-123", "::add-mask::tok-refresh-456"])
        for line in lines[2:]:
            self.assertNotIn("tok-id-123", line)
            self.assertNotIn("tok-refresh-456", line)
        self.assertEqual(len(lines), 3)
        self.assertTrue(lines[2].startswith("signed in: u1"))
        stored = json.loads(get_item(storage_dir(self.data), auth_key("AIza")))
        self.assertEqual(stored["uid"], "u1")
        self.assertEqual(stored["stsTokenManager"]["accessToken"], "tok-id-123")
        self.assertEqual(self.status.read_text(encoding="utf-8"), "ok")

    def test_session_bad_password(self):
        env = {"DUO_TEST_EMAIL": "a@b.c", "DUO_TEST_PASSWORD": "bad"}
        with mock.patch.object(appstate, "sign_in", side_effect=SignInError("INVALID_LOGIN_CREDENTIALS")):
            code, lines = self.run_session(env)
        self.assertEqual(code, 1)
        self.assertEqual(lines, ["sign-in failed: INVALID_LOGIN_CREDENTIALS"])
        self.assertEqual(self.status.read_text(encoding="utf-8"),
                         "sign-in failed: INVALID_LOGIN_CREDENTIALS")
        self.assertIsNone(get_item(storage_dir(self.data), auth_key("AIza")))

    def test_session_no_secrets(self):
        with mock.patch.dict(os.environ):
            os.environ.pop("DUO_TEST_EMAIL", None)
            os.environ.pop("DUO_TEST_PASSWORD", None)
            code, _ = self.run_session({})
        self.assertEqual(code, 1)
        self.assertEqual(self.status.read_text(encoding="utf-8"),
                         "sign-in failed: no test account secrets")

    def test_session_missing_app_config(self):
        (self.app / "EXConstants.bundle" / "app.config").unlink()
        env = {"DUO_TEST_EMAIL": "a@b.c", "DUO_TEST_PASSWORD": "pw"}
        code, lines = self.run_session(env)
        self.assertEqual(code, 1)
        self.assertEqual(lines, ["sign-in failed: no API key in the app"])
        self.assertEqual(self.status.read_text(encoding="utf-8"), "sign-in failed: no API key in the app")


class UpdateTests(unittest.TestCase):
    def setUp(self):
        self._t = tempfile.TemporaryDirectory()
        self.addCleanup(self._t.cleanup)
        root = Path(self._t.name)
        self.data, self.app = root / "data", root / "App.app"
        write(self.app / "EXUpdates.bundle" / "app.manifest", json.dumps({"id": EMBEDDED}))
        with open(self.app / "Expo.plist", "wb") as fh:
            plistlib.dump({"EXUpdatesRuntimeVersion": "rt1"}, fh)

    def make_db(self, rows):
        d = self.data / "Library" / "Application Support" / ".expo-internal"
        d.mkdir(parents=True)
        con = sqlite3.connect(d / "expo-v4.db")
        con.execute("CREATE TABLE updates (id BLOB, commit_time INTEGER, last_accessed INTEGER, "
                    "runtime_version TEXT, status INTEGER)")
        for uid, commit, accessed in rows:
            con.execute("INSERT INTO updates VALUES (?,?,?,?,?)",
                        (bytes.fromhex(uid.replace("-", "")), commit, accessed, "rt1", 1))
        con.commit()
        con.close()

    def test_running_update_embedded(self):
        self.make_db([(EMBEDDED, 1000, 5)])
        r = appstate.running_update(self.data, self.app)
        self.assertIs(r["embedded"], True)
        self.assertEqual(r["build_runtime"], "rt1")
        self.assertEqual(r["update_id"], EMBEDDED)

    def test_running_update_newer(self):
        self.make_db([(EMBEDDED, 1000, 5), (NEWER, 1700000000000, 9)])
        r = appstate.running_update(self.data, self.app)
        self.assertEqual(r["update_id"], NEWER)
        self.assertEqual(r["update_time"], "2023-11-14T22:13:20+00:00")
        self.assertIs(r["embedded"], False)

    def test_running_update_no_db(self):
        r = appstate.running_update(self.data, self.app)
        self.assertIs(r["embedded"], True)
        self.assertIsNone(r["update_id"])

    def test_update_db_without_table(self):
        d = self.data / "Library" / "Application Support" / ".expo-internal"
        d.mkdir(parents=True)
        sqlite3.connect(d / "expo-v4.db").close()
        for args in ([], ["--wait", "1"]):
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                code = appstate.main(["update", str(self.data), str(self.app)] + args)
            self.assertEqual(code, 0)
            self.assertIs(json.loads(out.getvalue())["embedded"], True)


if __name__ == "__main__":
    unittest.main()
