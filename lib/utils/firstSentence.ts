// A place's description for a list card: its first sentence, so the card's text ends where
// a sentence does and not wherever two lines run out (owner, 2026-11-13). A first sentence
// too long for the card is cut back to its last comma, or failing that its last whole
// word, and marked as cut.
export function firstSentence(text: string, max = 120): string {
  const clean = text.trim().replace(/\s+/g, " ");
  const end = clean.search(/[.!?](\s|$)/);
  const sentence = end === -1 ? clean : clean.slice(0, end + 1);
  if (sentence.length <= max) return sentence;
  const head = sentence.slice(0, max);
  const comma = head.lastIndexOf(", ");
  const cut = comma > max / 2 ? comma : head.lastIndexOf(" ");
  return `${head.slice(0, cut > 0 ? cut : max).replace(/[,;:]$/, "")}…`;
}
