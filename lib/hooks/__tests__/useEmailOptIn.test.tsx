// Permission to email someone for feedback and news: yes or no, with when it was given, on
// their own users/{uid} record. Asked unticked at sign-up (useAuthForm) and changeable on
// the Account tab. NZ's Unsolicited Electronic Messages Act needs the consent on record.

jest.mock("@/lib/firebase", () => ({ db: {} }));
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: jest.fn() }));
jest.mock("firebase/firestore", () => ({
  doc: jest.fn((_db, _col, uid) => ({ __doc: uid })),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => "SERVER_TIME"),
}));

import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider, notifyManager } from "@tanstack/react-query";
import { getDoc, setDoc } from "firebase/firestore";

notifyManager.setScheduler((cb) => cb());
import { useSession } from "@/lib/providers/SessionProvider";
import { saveEmailOptIn, useEmailOptIn } from "@/lib/hooks/useEmailOptIn";

const mockUseSession = useSession as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockGetDoc.mockReset();
  mockSetDoc.mockReset().mockResolvedValue(undefined);
});

it("saves the answer and when it was given, beside the user's saved places", async () => {
  await saveEmailOptIn("user-1", true);

  expect(mockSetDoc).toHaveBeenCalledWith(
    { __doc: "user-1" },
    { emailOptIn: { value: true, at: "SERVER_TIME" } },
    { merge: true },
  );
});

it("reads yes from the user's record", async () => {
  mockUseSession.mockReturnValue({ session: { status: "authed", uid: "user-1" } });
  mockGetDoc.mockResolvedValue({ data: () => ({ emailOptIn: { value: true } }) });
  const { result } = await renderHook(() => useEmailOptIn(), { wrapper });

  await waitFor(() => expect(result.current.optedIn).toBe(true));
});

// Everyone who signed up before the box existed has no answer: that's no, not yes.
it("reads no when the record has no answer", async () => {
  mockUseSession.mockReturnValue({ session: { status: "authed", uid: "user-1" } });
  mockGetDoc.mockResolvedValue({ data: () => ({ savedSites: ["a"] }) });
  const { result } = await renderHook(() => useEmailOptIn(), { wrapper });

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.optedIn).toBe(false);
});

it("turns it on from the Account switch", async () => {
  mockUseSession.mockReturnValue({ session: { status: "authed", uid: "user-1" } });
  // No answer at first; the read after the save finds the yes.
  mockGetDoc
    .mockResolvedValueOnce({ data: () => ({}) })
    .mockResolvedValue({ data: () => ({ emailOptIn: { value: true } }) });
  const { result } = await renderHook(() => useEmailOptIn(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));

  await act(async () => result.current.setOptedIn(true));

  expect(mockSetDoc).toHaveBeenCalledWith(
    { __doc: "user-1" },
    { emailOptIn: { value: true, at: "SERVER_TIME" } },
    { merge: true },
  );
  expect(result.current.optedIn).toBe(true);
});

it("goes back to the old answer when the save fails", async () => {
  mockUseSession.mockReturnValue({ session: { status: "authed", uid: "user-1" } });
  mockGetDoc.mockResolvedValue({ data: () => ({ emailOptIn: { value: false } }) });
  mockSetDoc.mockRejectedValue(new Error("offline"));
  const { result } = await renderHook(() => useEmailOptIn(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));

  await act(async () => result.current.setOptedIn(true));

  await waitFor(() => expect(result.current.optedIn).toBe(false));
});

it("reads and writes nothing for a guest", async () => {
  mockUseSession.mockReturnValue({ session: { status: "guest" } });
  const { result } = await renderHook(() => useEmailOptIn(), { wrapper });

  await act(async () => result.current.setOptedIn(true));

  expect(mockGetDoc).not.toHaveBeenCalled();
  expect(mockSetDoc).not.toHaveBeenCalled();
  expect(result.current.optedIn).toBe(false);
});
