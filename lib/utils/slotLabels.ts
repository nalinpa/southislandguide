// Grid starts at 8:00 AM; each slot is 30 minutes. No imports, so the site export
// script (scripts/export-site-trips.mjs) can load it.

export function slotsToDurationLabel(durationSlots: number): string {
  if (durationSlots === 1) return "30 min";
  const hours = durationSlots / 2;
  return `${hours} Hour${hours !== 1 ? "s" : ""}`;
}

export function slotIndexToTimeLabel(slotIndex: number): string {
  const totalMinutes = 8 * 60 + slotIndex * 30;
  // Past midnight on a day that runs over: the next morning's hours.
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}
