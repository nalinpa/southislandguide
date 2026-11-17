/** Sideways the status bar sits in the rail, so a screen's top inset is 0 and its content
 *  would start ~16 pt from the corner. A wide screen keeps at least this much (owner, 2026-11-16). */
export const WIDE_TOP_MIN = 32;

/** `own` is the screen's current top (inset included). With a status-bar inset it stands;
 *  with none (sideways) it is lifted to WIDE_TOP_MIN. */
export const wideTop = (inset: number, own: number) => (inset > 0 ? own : Math.max(own, WIDE_TOP_MIN));

/** The Profile's first row and its right pane's photo card start here: 56 upright, the wide top sideways. */
export const profileTop = (upright: boolean, inset: number) => (upright ? 56 : wideTop(inset, 16));
