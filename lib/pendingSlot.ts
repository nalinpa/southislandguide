// The gap a trip's "Find more things to do" was opened from, so Add to Trip can open on
// that day and time (tester, 2026-11-11: it "forgets the slot"). A module variable and
// not route params: Explore clears its params and opens places without any.
// ponytail: one pending slot, not reactive; Add to Trip reads it when it renders.
type PendingSlot = { tripId: string; dayId: string; slot: number };

let pending: (PendingSlot & { at: number }) | null = null;

export const setPendingSlot = (p: PendingSlot) => {
  pending = { ...p, at: Date.now() };
};

// Kept until a place is added (or half an hour passes), so looking at one place and
// backing out doesn't lose it.
export const peekPendingSlot = (tripId: string): PendingSlot | null =>
  pending && pending.tripId === tripId && Date.now() - pending.at < 30 * 60_000 ? pending : null;

export const clearPendingSlot = () => {
  pending = null;
};
