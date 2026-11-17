import { clearPendingSlot, currentPendingSlot, setPendingSlot } from "@/lib/pendingSlot";

describe("currentPendingSlot", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-11-17T10:00:00Z"));
    clearPendingSlot();
  });
  afterEach(() => jest.useRealTimers());

  it("keeps it 30 minutes", () => {
    expect(currentPendingSlot()).toBeNull();
    setPendingSlot({ tripId: "t1", dayId: "d1", slot: 20 });

    jest.setSystemTime(new Date("2026-11-17T10:29:59Z"));
    expect(currentPendingSlot()).toMatchObject({ tripId: "t1", dayId: "d1", slot: 20 });

    jest.setSystemTime(new Date("2026-11-17T10:30:00Z"));
    expect(currentPendingSlot()).toBeNull();
  });

  it("is gone once cleared", () => {
    setPendingSlot({ tripId: "t1", dayId: "d1", slot: 20 });
    clearPendingSlot();
    expect(currentPendingSlot()).toBeNull();
  });
});
