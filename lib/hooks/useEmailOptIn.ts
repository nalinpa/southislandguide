import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { COL } from "@/lib/constants/firestore";
import { useSession } from "@/lib/providers/SessionProvider";

// The words beside the sign-up box. Consent has to say what it's for (NZ's Unsolicited
// Electronic Messages Act), and the privacy policy says the same.
export const EMAIL_OPT_IN_LABEL = "Email me now and then to ask for feedback and share Kiwi Guide news";

// Yes or no, with when it was given, on the user's own record: users/{uid}, the one the
// Firestore rules let them write (saved places live there too). Deleting the account
// deletes the record, and this with it. Async so that any error, even one thrown before
// the write starts, reaches the caller's .catch rather than the sign-up's.
export async function saveEmailOptIn(uid: string, value: boolean) {
  return setDoc(doc(db, COL.users, uid), { emailOptIn: { value, at: serverTimestamp() } }, { merge: true });
}

// The Account tab's switch. No answer on the record (everyone who signed up before the
// box) reads as no.
export function useEmailOptIn() {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const queryClient = useQueryClient();
  const queryKey = ["emailOptIn", uid];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const snap = await getDoc(doc(db, COL.users, uid!));
      return snap.data()?.emailOptIn?.value === true;
    },
    enabled: !!uid,
  });

  const mutation = useMutation({
    mutationFn: (value: boolean) => saveEmailOptIn(uid!, value),
    onMutate: async (value: boolean) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<boolean>(queryKey);
      queryClient.setQueryData(queryKey, value);
      return { previous };
    },
    onError: (_err, _value, context) => queryClient.setQueryData(queryKey, context?.previous ?? false),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    optedIn: uid ? (data ?? false) : false,
    loading: !!uid && isLoading,
    setOptedIn: (value: boolean) => {
      if (uid) mutation.mutate(value);
    },
  };
}
