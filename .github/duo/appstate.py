"""Edit the installed app's storage between launches (runs on the macOS runner).

Storage facts (read from node_modules, Task 2 checks them on the runner):
- AsyncStorage folder: <data>/Library/Application Support/<bundle id>/RCTAsyncLocalStorage_V1/,
  holding manifest.json. A value of 1024 characters or fewer sits inline in the manifest
  (RNCAsyncStorage.mm lines 17-21: folder, manifest name, threshold; line 625: the inline test).
  A longer value goes in a file named with the lowercase hex MD5 of the key's UTF-8, and the
  manifest holds null for that key (lines 499-503).
- Firebase session: key firebase:authUser:<apiKey>:[DEFAULT], JSON read back by @firebase/auth
  UserImpl._fromJSON and StsTokenManager.fromJSON.

Python 3.9 and the standard library only. Never print the sign-in response or the record.
"""
from __future__ import annotations

import hashlib
import json
import os
import plistlib
import sqlite3
import sys
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

BUNDLE_ID = "app.blacksands.southislandguide"
COUNT_KEY = "southislandguide:appOpenCount"
INLINE_MAX = 1024


class SignInError(Exception):
    pass


def storage_dir(data: Path) -> Path:
    return Path(data) / "Library" / "Application Support" / BUNDLE_ID / "RCTAsyncLocalStorage_V1"


def _read_manifest(folder: Path) -> dict:
    path = Path(folder) / "manifest.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _value_file(folder: Path, key: str) -> Path:
    return Path(folder) / hashlib.md5(key.encode("utf-8")).hexdigest()


def get_item(folder: Path, key: str) -> str | None:
    value = _read_manifest(folder).get(key)
    if value is None:
        file = _value_file(folder, key)
        if file.exists():
            return file.read_text(encoding="utf-8")
    return value


def set_item(folder: Path, key: str, value: str) -> None:
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    manifest = _read_manifest(folder)
    file = _value_file(folder, key)
    if len(value) <= INLINE_MAX:
        manifest[key] = value
        if file.exists():
            file.unlink()
    else:
        manifest[key] = None
        file.write_text(value, encoding="utf-8")
    with open(folder / "manifest.json", "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, separators=(",", ":"))


def auth_key(api_key: str) -> str:
    return "firebase:authUser:%s:[DEFAULT]" % api_key


def api_key(app: Path) -> str:
    config = json.loads((Path(app) / "EXConstants.bundle" / "app.config").read_text(encoding="utf-8"))
    return config["extra"]["firebase"]["apiKey"]


def sign_in(api_key: str, email: str, password: str) -> dict:
    url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + api_key
    body = json.dumps({"email": email, "password": password, "returnSecureToken": True}).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            raise SignInError(json.loads(e.read().decode("utf-8"))["error"]["message"])
        except (ValueError, KeyError, TypeError):
            raise SignInError("HTTP %s" % e.code)
    except (urllib.error.URLError, OSError) as e:
        raise SignInError(str(e))


def user_record(resp: dict, api_key: str, now_ms: int) -> dict:
    return {
        "uid": resp["localId"],
        "email": resp["email"],
        "emailVerified": False,
        "isAnonymous": False,
        "providerData": [{"providerId": "password", "uid": resp["email"], "displayName": None,
                          "email": resp["email"], "phoneNumber": None, "photoURL": None}],
        "stsTokenManager": {"refreshToken": resp["refreshToken"], "accessToken": resp["idToken"],
                            "expirationTime": now_ms + int(resp["expiresIn"]) * 1000},
        "apiKey": api_key,
        "appName": "[DEFAULT]",
    }


# ponytail: expo-updates DB schema assumed (updates.id/last_accessed/commit_time); Task 2 checks it on the runner
def running_update(data: Path, app: Path) -> dict:
    app = Path(app)
    with open(app / "Expo.plist", "rb") as fh:
        runtime = plistlib.load(fh).get("EXUpdatesRuntimeVersion")
    embedded_id = json.loads((app / "EXUpdates.bundle" / "app.manifest").read_text(encoding="utf-8"))["id"]
    dbs = list((Path(data) / "Library" / "Application Support" / ".expo-internal").glob("expo-v*.db"))
    out = {"build_runtime": runtime, "update_id": None, "update_time": None, "embedded": True}
    if not dbs:
        return out
    try:
        con = sqlite3.connect(str(max(dbs, key=lambda p: p.stat().st_mtime)))
        try:
            row = con.execute("SELECT id, commit_time FROM updates ORDER BY last_accessed DESC LIMIT 1").fetchone()
        finally:
            con.close()
    except sqlite3.Error:  # the app is still creating or writing its DB: not downloaded yet
        return out
    if row:
        out["update_id"] = str(uuid.UUID(bytes=bytes(row[0])))
        out["update_time"] = datetime.fromtimestamp(row[1] / 1000, timezone.utc).isoformat()
        out["embedded"] = out["update_id"] == embedded_id.lower()
    return out


def _cmd_count(args: list) -> int:
    folder = storage_dir(Path(args[0]))
    old = get_item(folder, COUNT_KEY)
    if len(args) > 1:
        set_item(folder, COUNT_KEY, args[1])
        print("open count: %s -> %s" % (old, args[1]))
    else:
        print("open count: %s" % old)
    return 0


def _cmd_session(args: list) -> int:
    data, app, status = Path(args[0]), Path(args[1]), Path(args[2])
    try:
        email, password = os.environ.get("DUO_TEST_EMAIL"), os.environ.get("DUO_TEST_PASSWORD")
        if not email or not password:
            raise SignInError("no test account secrets")
        try:
            key = api_key(app)
        except (OSError, ValueError, KeyError, TypeError):
            raise SignInError("no API key in the app")
        resp = sign_in(key, email, password)
        print("::add-mask::" + resp["idToken"])
        print("::add-mask::" + resp["refreshToken"])
        record = user_record(resp, key, int(time.time() * 1000))
        set_item(storage_dir(data), auth_key(key), json.dumps(record, separators=(",", ":")))
    except Exception as e:  # any failure leaves a status line; only SignInError text is shown, never other messages
        line = "sign-in failed: %s" % (e if isinstance(e, SignInError) else type(e).__name__)
        print(line)
        status.write_text(line, encoding="utf-8")
        return 1
    print("signed in: %s…" % record["uid"][:6])
    status.write_text("ok", encoding="utf-8")
    return 0


def _cmd_update(args: list) -> int:
    data, app = Path(args[0]), Path(args[1])
    wait = int(args[3]) if len(args) > 3 and args[2] == "--wait" else 0
    deadline = time.time() + wait
    result = running_update(data, app)
    while wait and result["embedded"] and time.time() < deadline:
        time.sleep(3)
        result = running_update(data, app)
    print(json.dumps(result))
    return 0


def main(argv: list) -> int:
    cmds = {"count": _cmd_count, "session": _cmd_session, "update": _cmd_update}
    return cmds[argv[0]](argv[1:])


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
