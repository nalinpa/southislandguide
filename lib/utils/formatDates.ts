export function formatTripDates(startDate: string, endDate: string): string {
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
  if (!endDate || endDate === startDate) return fmt(startDate);
  return `${fmt(startDate)} — ${fmt(endDate)}`;
}
