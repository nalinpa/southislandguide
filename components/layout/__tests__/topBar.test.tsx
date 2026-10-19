// The brand bar. Pinned here: the title as a dropdown (Explore's town), which shares
// its row with the buttons and shrinks to fit a long name.

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

  // Beside three buttons an iPhone SE leaves a dropdown title about 150pt, and some town
  // names are longer than that: shrink, don't cut.
  it("shrinks a dropdown title to fit beside the buttons rather than cutting it off", async () => {
    const view = await render(
      <TopBar title="Queenstown & Wānaka" onTitlePress={jest.fn()} actions={buttons} compactTitle />,
    );

    expect(view.getByText("Queenstown & Wānaka").props.adjustsFontSizeToFit).toBe(true);
    expect(view.getByText("Queenstown & Wānaka")).toHaveStyle({ fontSize: 24 });
  });

  // The opening tour points at the town and its chevron (lib/tour), not the button's
  // spare width up to the bar's buttons.
  it("hands the tour the town and its chevron", async () => {
    const target = { ref: React.createRef<any>(), onLayout: jest.fn() };
    const view = await render(<TopBar title="Christchurch" onTitlePress={jest.fn()} titleTarget={target} />);

    await fireEvent(view.getByText("Christchurch"), "layout", { nativeEvent: { layout: {} } });

    expect(target.onLayout).toHaveBeenCalled();
    expect(target.ref.current).toBeTruthy();
    expect(within(view.getByRole("button", { name: "Christchurch" })).getByText("Christchurch")).toBeTruthy();
  });

  // For a screen whose controls are its top row (the trip screen's Trip | Days switch).
  it("draws no title row without a title, only what it is given", async () => {
    const { Text } = require("react-native");
    const view = await render(
      <TopBar>
        <Text>Switch</Text>
      </TopBar>,
    );

    expect(view.getByText("Switch")).toBeTruthy();
    expect(view.queryAllByText(/./)).toHaveLength(1);
  });
});

