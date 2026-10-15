// The brand bar. Pinned here: the title as a dropdown (Explore's town), which with
// actionsAbove gets the whole width under the buttons, so a long town name has room.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-router", () => ({
  // The bar owns the status bar while its screen is in front. Here it always is.
  useFocusEffect: (effect: () => void) => require("react").useEffect(effect, []),
}));

import React from "react";
import { fireEvent, render, within } from "@testing-library/react-native";

import { TopBar } from "@/components/layout/TopBar";
import { AppIconButton } from "@/test/uiKitMock";

const buttons = (
  <>
    <AppIconButton accessibilityLabel="Travel guide" onPress={jest.fn()} />
    <AppIconButton accessibilityLabel="Search Locations" onPress={jest.fn()} />
  </>
);

describe("TopBar", () => {
  it("puts the buttons beside the title by default", async () => {
    const view = await render(<TopBar title="Plans" actions={buttons} />);

    const titleRow = view.getByText("Plans").parent!;
    expect(within(titleRow).getByLabelText("Search Locations")).toBeTruthy();
  });

  it("makes the title a button that opens its dropdown", async () => {
    const onTitlePress = jest.fn();
    const view = await render(
      <TopBar title="Christchurch" onTitlePress={onTitlePress} titleLabel="Christchurch, choose a town" />,
    );

    await fireEvent.press(view.getByLabelText("Christchurch, choose a town"));

    expect(onTitlePress).toHaveBeenCalled();
  });

  // Beside three buttons an iPhone SE leaves the title about 150pt; "Christchurch" alone
  // needs about 240 at the title size.
  it("gives the title its own row under the buttons with actionsAbove", async () => {
    const view = await render(
      <TopBar
        title="Christchurch"
        onTitlePress={jest.fn()}
        titleLabel="Christchurch, choose a town"
        actions={buttons}
        actionsAbove
      />,
    );

    const titleRow = view.getByLabelText("Christchurch, choose a town").parent!;
    expect(within(titleRow).queryByLabelText("Search Locations")).toBeNull();
    expect(view.getByLabelText("Search Locations")).toBeTruthy();
  });

  // Some town names are longer than a phone is wide at the title size: shrink, don't cut.
  it("shrinks a dropdown title to fit rather than cutting it off", async () => {
    const view = await render(<TopBar title="Queenstown & Wānaka" onTitlePress={jest.fn()} actionsAbove />);

    expect(view.getByText("Queenstown & Wānaka").props.adjustsFontSizeToFit).toBe(true);
  });

  // Under the buttons the title already has the width; at full size the bar grew by
  // about 50pt. The smaller size and no gap above it keep the bar close to its old height.
  it("keeps a title under the buttons at the smaller size, tight under them", async () => {
    const view = await render(
      <TopBar title="Christchurch" onTitlePress={jest.fn()} titleLabel="Christchurch, choose a town" actions={buttons} actionsAbove />,
    );

    expect(view.getByText("Christchurch")).toHaveStyle({ fontSize: 24 });
    const stack = view.getByLabelText("Christchurch, choose a town").parent!.parent!;
    expect(stack).not.toHaveStyle({ gap: 8 });
    expect(within(stack).getByLabelText("Search Locations")).toBeTruthy();
  });
});
