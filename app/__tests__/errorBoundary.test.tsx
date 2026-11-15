// The error screen on the open iPhone Duo (docs/plans/design-sweep.md): upright, the sign and
// words end 16 above the fold and the 320-wide button starts 16 below; sideways, the words on
// the left page and the button on the right. The phone's screen is checked in _layout.test.tsx.
jest.mock("@/lib/polyfills/buffer", () => ({}));
jest.mock("expo", () => ({ isRunningInExpoGo: () => false }));
jest.mock("expo-splash-screen", () => ({ preventAutoHideAsync: jest.fn() }));
jest.mock("react-native-gesture-handler", () => ({ GestureHandlerRootView: ({ children }: any) => children }));
jest.mock("@sentry/react-native", () => ({
  reactNavigationIntegration: () => ({ registerNavigationContainer: jest.fn() }),
  init: jest.fn(),
  wrap: (c: any) => c,
  captureException: jest.fn(),
}));
jest.mock("expo-router", () => ({
  Stack: () => null,
  useNavigationContainerRef: () => ({}),
  useRouter: () => ({ replace: jest.fn() }),
}));
jest.mock("@/lib/hooksBag", () => ({ hooksBag: { useReviewPrompt: () => ({ requestReview: jest.fn() }) } }));
jest.mock("@/lib/hooks/useAppOpenCount", () => ({ useAppOpenCount: () => null }));
jest.mock("@/lib/hooks/useUpdateOnReturn", () => ({ useUpdateOnReturn: jest.fn() }));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ edges, ...props }: any) => require("react").createElement(require("react-native").View, props),
  SafeAreaProvider: ({ children }: any) => children,
}));
jest.mock("@/lib/providers/AppProviders", () => ({ AppProviders: ({ children }: any) => children }));
jest.mock("@/lib/uiKit", () => ({ OfflineBanner: () => null }));
jest.mock("lucide-react-native", () => ({ AlertTriangle: () => null }));
jest.mock("@/lib/tour/TourContext", () => ({ TourProvider: ({ children }: any) => children }));
jest.mock("@/lib/tour/TourAutoStart", () => ({ TourAutoStart: () => null }));
jest.mock("@/lib/tour/SpotlightOverlay", () => ({ SpotlightOverlay: () => null }));

import React from "react";
import { StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";

import { ErrorBoundary } from "../_layout";

const ui = () => require("@blacksands/ui");
const style = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);
const show = () => render(<ErrorBoundary error={new Error("x")} retry={jest.fn()} />);

describe("ErrorBoundary on a Duo", () => {
  it("wide upright: words end 16 above the fold, the 320 button starts 16 below", async () => {
    ui().__setWide(true, { width: 669, height: 951 });
    await show();

    // The two halves of the screen meet at the fold: words at the foot of the top, button at
    // the head of the bottom.
    expect(style("error-words")).toMatchObject({ flex: 1, justifyContent: "flex-end", paddingBottom: 16 });
    expect(style("error-button-half")).toMatchObject({ flex: 1, justifyContent: "flex-start", paddingTop: 16 });
    expect(style("error-button").width).toBe(320);
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Restart App")).toBeTruthy();
  });

  it("wide sideways: words on the left page, button on the right", async () => {
    ui().__setWide(true, { width: 951, height: 669 });
    await show();

    expect(style("error-screen").flexDirection).toBe("row");
    expect(style("error-words")).toMatchObject({ width: 475.5, justifyContent: "center" });
    expect(style("error-button-half")).toMatchObject({ flex: 1, justifyContent: "center" });
    expect(style("error-button").width).toBe(320);
  });

  it("phone: the button is full width, with no halves", async () => {
    await show();

    expect(screen.queryByTestId("error-button-half")).toBeNull();
    expect(style("error-button").alignSelf).toBe("stretch");
  });
});
