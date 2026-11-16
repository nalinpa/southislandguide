import { renderHook } from "@testing-library/react-native";

import { useWideSheet } from "@/lib/ui/useWideSheet";

const setWide = (on: boolean, size?: { width: number; height: number }) =>
  require("@blacksands/ui").__setWide(on, size);

describe("useWideSheet", () => {
  it("null on a phone", async () => {
    for (const kind of ["sheet", "list", "dialog"] as const) {
      expect((await renderHook(() => useWideSheet(kind))).result.current).toBeNull();
    }
  });

  it("sheet is 520 and centred, list caps at 760, dialog is 400 with its foot above the fold", async () => {
    setWide(true, { width: 669, height: 951 });
    const sheet = (await renderHook(() => useWideSheet("sheet"))).result.current!;
    expect(sheet.card.width).toBe(520);
    expect(sheet.card.borderTopLeftRadius).toBe(20);
    expect(sheet.card.borderBottomRightRadius).toBe(20);
    expect(sheet.card.shadowRadius).toBe(60);
    expect(sheet.card.borderWidth).toBe(1);
    expect(sheet.overlay.justifyContent).toBe("center");
    expect(sheet.animation).toBe("fade");

    const list = (await renderHook(() => useWideSheet("list"))).result.current!;
    expect(list.card.width).toBe(520);
    expect(list.card.maxHeight).toBe(760);
    expect(list.overlay.paddingTop).toBe(96);

    const dialog = (await renderHook(() => useWideSheet("dialog"))).result.current!;
    expect(dialog.card.width).toBe(400);
    // foot 24 above foldY (475.5): that leaves height - foldY + 24 under it
    expect(dialog.overlay.justifyContent).toBe("flex-end");
    expect(dialog.overlay.paddingBottom).toBe(951 - 475.5 + 24);
  });

  it("a centred list stays centred upright, capped to the window with 24 clear, and keeps the 760 cap", async () => {
    setWide(true, { width: 669, height: 951 });
    const list = (await renderHook(() => useWideSheet("list", { centred: true }))).result.current!;
    expect(list.overlay.justifyContent).toBe("center");
    expect(list.overlay.paddingTop).toBeUndefined();
    expect(list.card.width).toBe(520);
    expect(list.card.maxHeight).toBe(760);
    setWide(true, { width: 669, height: 700 });
    expect((await renderHook(() => useWideSheet("list", { centred: true }))).result.current!.card.maxHeight).toBe(652);
    // and the plain list is as it was
    expect((await renderHook(() => useWideSheet("list"))).result.current!.overlay.paddingTop).toBe(96);
  });

  it("sideways: a list is capped to the window, a dialog is centred", async () => {
    setWide(true, { width: 951, height: 669 });
    const list = (await renderHook(() => useWideSheet("list"))).result.current!;
    expect(list.card.maxHeight).toBe(621);
    expect(list.overlay.justifyContent).toBe("center");
    expect((await renderHook(() => useWideSheet("dialog"))).result.current!.overlay.justifyContent).toBe("center");
  });
});
