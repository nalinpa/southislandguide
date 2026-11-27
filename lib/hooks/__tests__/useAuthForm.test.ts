import { renderHook, act } from "@testing-library/react-native";

jest.mock("@/lib/firebase", () => ({ auth: {} }));
jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));
jest.mock("@/lib/analytics", () => ({ logSignUp: jest.fn() }));
const mockSaveEmailOptIn = jest.fn();
jest.mock("@/lib/hooks/useEmailOptIn", () => ({
  saveEmailOptIn: (...args: any[]) => mockSaveEmailOptIn(...args),
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { logSignUp } from "@/lib/analytics";
import { useAuthForm } from "@/lib/hooks/useAuthForm";

const mockSignIn = signInWithEmailAndPassword as jest.Mock;
const mockSignUp = createUserWithEmailAndPassword as jest.Mock;
const mockReset = sendPasswordResetEmail as jest.Mock;

describe("useAuthForm", () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockSignUp.mockReset();
    mockReset.mockReset();
    mockSaveEmailOptIn.mockReset();
    (logSignUp as jest.Mock).mockClear();
  });

  describe("canSubmit", () => {
    it("login mode requires both email and password", async () => {
      const { result } = await renderHook(() => useAuthForm("login"));
      expect(result.current.canSubmit).toBe(false);

      await act(async () => result.current.setEmail("a@b.com"));
      expect(result.current.canSubmit).toBe(false);

      await act(async () => result.current.setPassword("pw"));
      expect(result.current.canSubmit).toBe(true);
    });

    it("reset mode only requires email", async () => {
      const { result } = await renderHook(() => useAuthForm("reset"));
      expect(result.current.canSubmit).toBe(false);

      await act(async () => result.current.setEmail("a@b.com"));
      expect(result.current.canSubmit).toBe(true);
    });

    it("signup mode requires password to match confirm", async () => {
      const { result } = await renderHook(() => useAuthForm("signup"));
      await act(async () => {
        result.current.setEmail("a@b.com");
        result.current.setPassword("pw1");
        result.current.setConfirm("pw2");
      });
      expect(result.current.canSubmit).toBe(false);

      await act(async () => result.current.setConfirm("pw1"));
      expect(result.current.canSubmit).toBe(true);
    });
  });

  describe("title/subtitle", () => {
    it.each([
      ["login", "Welcome back", "Sign in to continue"],
      ["signup", "Create account", "Sign up to get started"],
      ["reset", "Reset your password", "We'll email you a reset link"],
    ] as const)("%s mode", async (mode, title, subtitle) => {
      const { result } = await renderHook(() => useAuthForm(mode));
      expect(result.current.title).toBe(title);
      expect(result.current.subtitle).toBe(subtitle);
    });
  });

  describe("submit", () => {
    it("signs in with email/password in login mode", async () => {
      mockSignIn.mockResolvedValue(undefined);
      const { result } = await renderHook(() => useAuthForm("login"));
      await act(async () => {
        result.current.setEmail("a@b.com");
        result.current.setPassword("pw");
      });

      await act(async () => result.current.submit());

      expect(mockSignIn).toHaveBeenCalledWith({}, "a@b.com", "pw");
      expect(result.current.busy).toBe(false);
      expect(result.current.err).toBeNull();
    });

    it("creates an account in signup mode", async () => {
      mockSignUp.mockResolvedValue({ user: { uid: "new-user" } });
      mockSaveEmailOptIn.mockResolvedValue(undefined);
      const { result } = await renderHook(() => useAuthForm("signup"));
      await act(async () => {
        result.current.setEmail("a@b.com");
        result.current.setPassword("pw");
        result.current.setConfirm("pw");
      });

      await act(async () => result.current.submit());

      expect(mockSignUp).toHaveBeenCalledWith({}, "a@b.com", "pw");
    });

    // The box starts unticked, and a no is recorded too, with its date.
    it("logs sign_up with email on signup, and nothing on login or a failed signup", async () => {
      mockSignUp.mockResolvedValue({ user: { uid: "u1" } });
      mockSignIn.mockResolvedValue({});
      const login = await renderHook(() => useAuthForm("login"));
      await act(async () => login.result.current.setEmail("a@b.com"));
      await act(async () => login.result.current.setPassword("pw"));
      await act(async () => login.result.current.submit());
      expect(logSignUp).not.toHaveBeenCalled();

      const { result } = await renderHook(() => useAuthForm("signup"));
      await act(async () => result.current.setEmail("a@b.com"));
      await act(async () => result.current.setPassword("pw"));
      await act(async () => result.current.setConfirm("pw"));
      mockSignUp.mockRejectedValueOnce(new Error("x"));
      await act(async () => result.current.submit());
      expect(logSignUp).not.toHaveBeenCalled();
      await act(async () => result.current.submit());
      expect(logSignUp).toHaveBeenCalledTimes(1);
      expect(logSignUp).toHaveBeenCalledWith("email");
    });

    it("records no for email when the box was left unticked", async () => {
      mockSignUp.mockResolvedValue({ user: { uid: "new-user" } });
      mockSaveEmailOptIn.mockResolvedValue(undefined);
      const { result } = await renderHook(() => useAuthForm("signup"));
      expect(result.current.emailOptIn).toBe(false);
      await act(async () => {
        result.current.setEmail("a@b.com");
        result.current.setPassword("pw");
        result.current.setConfirm("pw");
      });

      await act(async () => result.current.submit());

      expect(mockSaveEmailOptIn).toHaveBeenCalledWith("new-user", false);
    });

    it("records yes for email when the box was ticked", async () => {
      mockSignUp.mockResolvedValue({ user: { uid: "new-user" } });
      mockSaveEmailOptIn.mockResolvedValue(undefined);
      const { result } = await renderHook(() => useAuthForm("signup"));
      await act(async () => {
        result.current.setEmail("a@b.com");
        result.current.setPassword("pw");
        result.current.setConfirm("pw");
        result.current.setEmailOptIn(true);
      });

      await act(async () => result.current.submit());

      expect(mockSaveEmailOptIn).toHaveBeenCalledWith("new-user", true);
    });

    // The account exists by then, so no signal for the save mustn't look like a failed sign-up.
    it("still signs up when saving the email answer fails", async () => {
      mockSignUp.mockResolvedValue({ user: { uid: "new-user" } });
      mockSaveEmailOptIn.mockRejectedValue(new Error("offline"));
      const { result } = await renderHook(() => useAuthForm("signup"));
      await act(async () => {
        result.current.setEmail("a@b.com");
        result.current.setPassword("pw");
        result.current.setConfirm("pw");
      });

      await act(async () => result.current.submit());

      expect(result.current.err).toBeNull();
      expect(require("@sentry/react-native").captureException).toHaveBeenCalled();
    });

    it("asks nothing about email when signing in", async () => {
      mockSignIn.mockResolvedValue(undefined);
      const { result } = await renderHook(() => useAuthForm("login"));
      await act(async () => {
        result.current.setEmail("a@b.com");
        result.current.setPassword("pw");
      });

      await act(async () => result.current.submit());

      expect(mockSaveEmailOptIn).not.toHaveBeenCalled();
    });

    it("sends a reset email and sets a notice in reset mode", async () => {
      mockReset.mockResolvedValue(undefined);
      const { result } = await renderHook(() => useAuthForm("reset"));
      await act(async () => result.current.setEmail("a@b.com"));

      await act(async () => result.current.submit());

      expect(mockReset).toHaveBeenCalledWith({}, "a@b.com");
      expect(result.current.notice).toBe("Check your email for a reset link.");
    });

    it("surfaces the error message and clears busy when the request fails", async () => {
      mockSignIn.mockRejectedValue(new Error("bad credentials"));
      const { result } = await renderHook(() => useAuthForm("login"));
      await act(async () => {
        result.current.setEmail("a@b.com");
        result.current.setPassword("pw");
      });

      await act(async () => result.current.submit());

      expect(result.current.err).toBe("bad credentials");
      expect(result.current.busy).toBe(false);
    });

    it("falls back to a generic message for non-Error rejections", async () => {
      mockSignIn.mockRejectedValue("nope");
      const { result } = await renderHook(() => useAuthForm("login"));
      await act(async () => {
        result.current.setEmail("a@b.com");
        result.current.setPassword("pw");
      });

      await act(async () => result.current.submit());

      expect(result.current.err).toBe("Something went wrong");
    });

    it("maps a Firebase auth error code to a friendly message", async () => {
      mockSignIn.mockRejectedValue(
        Object.assign(new Error("Firebase: Error (auth/invalid-credential)."), { code: "auth/invalid-credential" }),
      );
      const { result } = await renderHook(() => useAuthForm("login"));
      await act(async () => {
        result.current.setEmail("a@b.com");
        result.current.setPassword("pw");
      });

      await act(async () => result.current.submit());

      expect(result.current.err).toBe("Incorrect email or password.");
    });
  });

  describe("errors and setters", () => {
    it("an error clears when the email changes", async () => {
      mockSignIn.mockRejectedValue(new Error("bad credentials"));
      const { result } = await renderHook(() => useAuthForm("login"));
      await act(async () => result.current.submit());
      expect(result.current.err).toBe("bad credentials");
      await act(async () => result.current.setEmail("a@b.com"));
      expect(result.current.err).toBeNull();
    });

    it("an error clears when the mode changes", async () => {
      const { result } = await renderHook(() => useAuthForm("login"));
      await act(async () => result.current.setErr("Apple failed"));
      expect(result.current.err).toBe("Apple failed");
      await act(async () => result.current.setMode("signup"));
      expect(result.current.err).toBeNull();
    });

    it("the setters keep their identity across renders", async () => {
      const { result } = await renderHook(() => useAuthForm("login"));
      const first = [result.current.setMode, result.current.setEmail, result.current.setPassword, result.current.setConfirm];
      await act(async () => result.current.setEmail("a@b.com"));
      expect([result.current.setMode, result.current.setEmail, result.current.setPassword, result.current.setConfirm]).toEqual(first);
    });
  });

  // The trip quiz, when the api turned a sign-in down mid-save: the form opens on Sign in with their email in and a
  // line saying why. Every other form starts empty.
  describe("started from what it is given", () => {
    it("starts with the email and the line it is handed, which goes as any error does", async () => {
      const { result } = await renderHook(() => useAuthForm("login", { email: "kia@ora.nz", err: "Please sign in again to save your trip." }));
      expect(result.current.mode).toBe("login");
      expect(result.current.email).toBe("kia@ora.nz");
      expect(result.current.err).toBe("Please sign in again to save your trip.");

      await act(async () => result.current.setPassword("pw"));
      expect(result.current.err).toBeNull();
      expect(result.current.canSubmit).toBe(true);
    });

    it("starts empty without one", async () => {
      const { result } = await renderHook(() => useAuthForm("login"));
      expect(result.current.email).toBe("");
      expect(result.current.err).toBeNull();
    });
  });
});
