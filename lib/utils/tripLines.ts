// A day's route for the row's bold line. A town's name never breaks ("Aoraki / Mount Cook"
// stays in one piece), and an arrow goes with the town after it, so a line never ends on an
// arrow left hanging (design sweep, 2026-11-13). \u00A0 is a space a line can't break at.
export function routeLine(towns: string[]): string {
  return towns.map((t) => t.replace(/ /g, "\u00A0")).join(" \u2192\u00A0");
}

// In parts, not one format call: en-NZ puts a comma after the weekday on some engines
// and not others.
export function dateParts(iso: string, length: "short" | "long"): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.toLocaleDateString("en-NZ", { weekday: length })} ${d.toLocaleDateString("en-NZ", { day: "numeric", month: length })}`;
}
