import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

type Session =
  | { status: "loading" }
  | { status: "loggedOut" }
  | { status: "guest" }
  | { status: "authed"; uid: string };

type SessionContextValue = {
  session: Session;
  enableGuest: () => Promise<void>;
  disableGuest: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  // Guest from the start: the app opens on Explore, and sign-in waits until it's needed.
  // Signing out or deleting the account turns this off, which lands on the login screen.
  const [isGuest, setIsGuest] = useState(true);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const session: Session = useMemo(() => {
    if (user === undefined) return { status: "loading" };
    if (user) return { status: "authed", uid: user.uid };
    if (isGuest) return { status: "guest" };
    return { status: "loggedOut" };
  }, [user, isGuest]);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      enableGuest: async () => setIsGuest(true),
      disableGuest: async () => setIsGuest(false),
    }),
    [session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
