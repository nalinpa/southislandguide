jest.mock("@/lib/firebase", () => ({ auth: {} }));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { extra: { google: { webClientId: "web-client-id" } } } },
}));
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
  },
}));
jest.mock("firebase/auth", () => ({
  GoogleAuthProvider: { credential: jest.fn() },
  signInWithCredential: jest.fn(),
  getAdditionalUserInfo: jest.fn(),
}));
jest.mock("@/lib/analytics", () => ({ logSignUp: jest.fn() }));

import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { GoogleAuthProvider, signInWithCredential, getAdditionalUserInfo } from "firebase/auth";
import { logSignUp } from "@/lib/analytics";
import { getGoogleSignInErrorMessage, signInWithGoogle } from "@/lib/auth/googleSignIn";

const mockConfigure = GoogleSignin.configure as jest.Mock;
const mockHasPlayServices = GoogleSignin.hasPlayServices as jest.Mock;
const mockSignIn = GoogleSignin.signIn as jest.Mock;
const mockCredential = GoogleAuthProvider.credential as jest.Mock;
const mockSignInWithCredential = signInWithCredential as jest.Mock;

describe("getGoogleSignInErrorMessage", () => {
  it("returns a friendly message for the account-exists conflict", () => {
    const msg = getGoogleSignInErrorMessage({ code: "auth/account-exists-with-different-credential" });
    expect(msg).toBe("An account already exists with this email — sign in with your password instead.");
  });

  it("returns the Error's message otherwise", () => {
    expect(getGoogleSignInErrorMessage(new Error("network down"))).toBe("network down");
  });

  it("falls back to a generic message for non-Error, non-coded values", () => {
    expect(getGoogleSignInErrorMessage("nope")).toBe("Something went wrong");
    expect(getGoogleSignInErrorMessage(undefined)).toBe("Something went wrong");
  });
});

describe("sign_up analytics", () => {
  beforeEach(() => {
    mockHasPlayServices.mockReset().mockResolvedValue(true);
    mockSignIn.mockReset().mockResolvedValue({ type: "success", data: { idToken: "t" } });
    mockCredential.mockReset().mockReturnValue({});
    mockSignInWithCredential.mockReset().mockResolvedValue({ user: {} });
    (logSignUp as jest.Mock).mockClear();
  });

  it("a new Google user logs sign_up with google", async () => {
    (getAdditionalUserInfo as jest.Mock).mockReturnValue({ isNewUser: true });
    await signInWithGoogle();
    expect(logSignUp).toHaveBeenCalledTimes(1);
    expect(logSignUp).toHaveBeenCalledWith("google");
  });

  it("a returning Google user logs nothing", async () => {
    (getAdditionalUserInfo as jest.Mock).mockReturnValue({ isNewUser: false });
    await signInWithGoogle();
    expect(logSignUp).not.toHaveBeenCalled();
  });

  it("a cancelled sign-in logs nothing", async () => {
    mockSignIn.mockResolvedValue({ type: "cancelled" });
    await signInWithGoogle();
    expect(logSignUp).not.toHaveBeenCalled();
  });
});

describe("signInWithGoogle", () => {
  const credential = { __credential: true };

  beforeEach(() => {
    mockConfigure.mockReset();
    mockHasPlayServices.mockReset().mockResolvedValue(true);
    mockSignIn.mockReset();
    mockCredential.mockReset().mockReturnValue(credential);
    mockSignInWithCredential.mockReset();
  });

  it("exchanges the Google id token for a Firebase credential", async () => {
    mockSignIn.mockResolvedValue({ type: "success", data: { idToken: "google-id-token" } });
    mockSignInWithCredential.mockResolvedValue(undefined);

    await signInWithGoogle();

    expect(mockConfigure).toHaveBeenCalledWith(expect.objectContaining({ webClientId: "web-client-id" }));
    expect(mockCredential).toHaveBeenCalledWith("google-id-token");
    expect(mockSignInWithCredential).toHaveBeenCalledWith({}, credential);
  });

  it("returns quietly when the user cancels", async () => {
    mockSignIn.mockResolvedValue({ type: "cancelled" });

    await signInWithGoogle();

    expect(mockSignInWithCredential).not.toHaveBeenCalled();
  });

  it("throws when Google doesn't return an id token", async () => {
    mockSignIn.mockResolvedValue({ type: "success", data: {} });

    await expect(signInWithGoogle()).rejects.toThrow("Google did not return an id token");
    expect(mockSignInWithCredential).not.toHaveBeenCalled();
  });
});
