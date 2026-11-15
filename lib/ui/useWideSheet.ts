import type { ViewStyle } from "react-native";
import { useHalves, useWide } from "@blacksands/ui";

import { darkEdge } from "@/lib/ui/tokens";

// On the open Duo a pop-up is a centred card over the dim, not a sheet on the bottom edge
// (docs/plans/design-sweep.md, "The pop-up sheets, picked"). Null on a phone, so a caller
// keeps its own styles: `wide && ...`.
//   sheet:  520 wide, centred on the fold.
//   list:   520 wide, up to 760 tall from 96 down (upright), scrolling inside.
//   dialog: 400 wide, its foot 24 above the fold (upright).
// Sideways, all three are centred in the window.
export type SheetKind = "sheet" | "list" | "dialog";

// Every corner of a card inside the wrapper that carries the lift: the phone's sheets set
// their bottom corners to 0, and a specific corner beats borderRadius.
export const WIDE_CORNERS = {
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  borderBottomLeftRadius: 20,
  borderBottomRightRadius: 20,
} as const;

type Mutable = { -readonly [K in keyof ViewStyle]: ViewStyle[K] };

export function useWideSheet(
  kind: SheetKind,
): { overlay: ViewStyle; card: ViewStyle; animation: "fade" | "slide" } | null {
  const wide = useWide();
  const { height, foldY, upright } = useHalves();
  if (!wide) return null;

  const overlay: Mutable = { alignItems: "center", justifyContent: "center" };
  const card: Mutable = {
    ...WIDE_CORNERS,
    width: kind === "dialog" ? 400 : 520,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 20 },
    borderWidth: 1,
    borderColor: darkEdge.borderColor,
  };

  if (kind === "list") {
    overlay.justifyContent = upright ? "flex-start" : "center";
    if (upright) overlay.paddingTop = 96;
    card.maxHeight = Math.min(760, upright ? height - 96 - 24 : height - 48);
  } else if (kind === "dialog" && upright) {
    overlay.justifyContent = "flex-end";
    overlay.paddingBottom = height - foldY + 24;
  }
  return { overlay, card, animation: "fade" };
}
