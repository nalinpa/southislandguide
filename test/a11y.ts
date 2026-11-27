// A screen as VoiceOver reaches it, for the quiz's sweep (stage 8 of docs/plans/app-trip-builder.md). Everything a
// finger can tap (a press handler, which every touchable and pressable gives its view) must have a role and a name:
// its label, or else its words. A view kept from VoiceOver (accessible={false}) isn't one of its stops.
//
// The kit's AppButton is stood in for by test/uiKitMock, whose button always says "button": the real one's role is
// pinned in the kit's own tests. What is swept here is everything else on the screen, and that each kit button has
// words.

type Node = { type: unknown; props: Record<string, any>; queryAll: (match: (n: Node) => boolean) => Node[] };

/** Every string and number in the node's Text, in order. */
export function wordsIn(node: Node): string {
  return node
    .queryAll((n) => n.type === "Text")
    .flatMap((t) => [t.props.children].flat())
    .filter((c) => typeof c === "string" || typeof c === "number")
    .join(" ");
}

/** What can be tapped on screen, as VoiceOver reaches it. */
export function tappable(root: Node): Node[] {
  return root.queryAll((n) => typeof n.props.onClick === "function" && n.props.accessible !== false);
}

/** Each tappable thing with no role or no name, said with its role and name, so a test can expect none. */
export function unnamed(root: Node): string[] {
  return tappable(root)
    .map((n) => ({ role: n.props.accessibilityRole ?? n.props.role, name: n.props.accessibilityLabel ?? wordsIn(n) }))
    .filter((b) => !b.role || !String(b.name).trim())
    .map((b) => `${b.role ?? "no role"}: "${b.name}"`);
}
