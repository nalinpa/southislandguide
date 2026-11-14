import { slotRangeLabel } from "@/lib/utils/itineraryPhysics";

// Slot 0 is 8:00 AM; each slot is half an hour.
describe("slotRangeLabel", () => {
  it("says the half of the day once when both ends share it", () => {
    expect(slotRangeLabel(10, 2)).toBe("1:00 – 2:00 PM");
    expect(slotRangeLabel(0, 1)).toBe("8:00 – 8:30 AM");
  });

  it("says it at both ends when a place runs across midday", () => {
    expect(slotRangeLabel(7, 2)).toBe("11:30 AM – 12:30 PM");
  });
});
