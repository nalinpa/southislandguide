// Tests the review prompt trigger in the root layout: fires on the fifth app open,
// not on the fourth or sixth.
jest.mock("@/lib/polyfills/buffer", () => ({}));
jest.mock("expo", () => ({ isRunningInExpoGo: () => false }));
jest.mock("expo-splash-screen", () => ({ preventAutoHideAsync: jest.fn() }));
jest.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: ({ children }: any) => children,
}));
jest.mock("@sentry/react-native", () => ({
  reactNavigationIntegration: () => ({ registerNavigationContainer: jest.fn() }),
  init: jest.fn(),
  wrap: (c: any) => c,
  captureException: jest.fn(),
}));
jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const Stack = ({ children }: any) => React.createElement(React.Fragment, null, React.createElement(Text, null, "screens"), children);
  // Draws nothing; keeps each screen's options by its name, for the tests that read them.
  Stack.Screen = ({ name, options }: any) => {
    mockScreens[name] = options;
    return null;
  };
  return {
    Stack,
    useNavigationContainerRef: () => mockNavigationRef,
    useRouter: () => mockRouter,
  };
});
jest.mock("@/lib/hooksBag", () => ({
  hooksBag: {
    useReviewPrompt: () => ({ requestReview: mockRequestReview }),
  },
}));
jest.mock("@/lib/hooks/useAppOpenCount", () => ({
  useAppOpenCount: () => mockOpenCount,
}));
// Has its own tests (useUpdateOnReturn.test.ts); here it only has to be called.
const mockUseUpdateOnReturn = jest.fn();
jest.mock("@/lib/hooks/useUpdateOnReturn", () => ({
  useUpdateOnReturn: () => mockUseUpdateOnReturn(),
}));
// A View named after its edges (safe-left-right), and a provider that just renders.
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ edges, ...props }: any) =>
    require("react").createElement(require("react-native").View, { ...props, testID: `safe-${(edges ?? []).join("-")}` }),
  SafeAreaProvider: ({ children }: any) => children,
}));
jest.mock("@/lib/providers/AppProviders", () => ({
  AppProviders: ({ children }: any) => children,
}));
jest.mock("@/lib/uiKit", () => ({
  OfflineBanner: () => null,
}));
jest.mock("lucide-react-native", () => ({
  AlertTriangle: () => null,
}));
// The opening tour has its own tests (lib/tour); here it only has to be mounted.
jest.mock("@/lib/tour/TourContext", () => ({
  TourProvider: ({ children }: any) => children,
}));
jest.mock("@/lib/tour/TourAutoStart", () => ({
  TourAutoStart: () => require("react").createElement(require("react-native").Text, null, "tour auto start"),
}));
jest.mock("@/lib/analytics", () => ({ initAnalytics: jest.fn() }));
jest.mock("@/lib/tour/SpotlightOverlay", () => ({
  SpotlightOverlay: () => require("react").createElement(require("react-native").Text, null, "tour overlay"),
}));

const mockRequestReview = jest.fn();
const mockScreens: Record<string, any> = {};
const mockNavigationRef = {};
const mockRouter = { replace: jest.fn() };
let mockOpenCount: number | null = null;

import React from "react";
import { render, act, screen, fireEvent, within } from "@testing-library/react-native";

// Import after mocks are set up.
import RootLayout, { ErrorBoundary } from "../_layout";

describe("RootLayout review prompt", () => {
  beforeEach(() => {
    mockRequestReview.mockReset();
    mockOpenCount = null;
  });

  it("does not ask on the fourth open", async () => {
    mockOpenCount = 4;
    await act(async () => {
      render(<RootLayout />);
    });
    expect(mockRequestReview).not.toHaveBeenCalled();
  });

  it("asks on the fifth open", async () => {
    mockOpenCount = 5;
    await act(async () => {
      render(<RootLayout />);
    });
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });

  it("does not ask on the sixth open", async () => {
    mockOpenCount = 6;
    await act(async () => {
      render(<RootLayout />);
    });
    expect(mockRequestReview).not.toHaveBeenCalled();
  });
});

describe("RootLayout opening tour", () => {
  it("mounts the tour and its overlay", async () => {
    await act(async () => {
      render(<RootLayout />);
    });
    expect(screen.getByText("tour auto start")).toBeTruthy();
    expect(screen.getByText("tour overlay")).toBeTruthy();
  });
});

// iPhone Duo: the screens keep clear of the side rail once, here; the tour's overlay covers
// the whole window and keeps its own card clear (lib/tour/SpotlightOverlay.tsx).
describe("RootLayout sides", () => {
  it("puts the screens inside the side-safe view, and the tour overlay outside it", async () => {
    await act(async () => {
      render(<RootLayout />);
    });
    const sides = screen.getByTestId("safe-left-right");
    expect(within(sides).getByText("screens")).toBeTruthy();
    expect(within(sides).queryByText("tour overlay")).toBeNull();
  });
});

// The trip quiz (app/build-trip.tsx): its own Back goes one question back and its Close leaves.
// iOS's swipe from the left edge would leave the whole quiz, so it is off for that screen.
describe("RootLayout trip quiz", () => {
  it("switches the edge swipe off for the quiz", async () => {
    await act(async () => {
      render(<RootLayout />);
    });
    expect(mockScreens["build-trip"]).toEqual(expect.objectContaining({ gestureEnabled: false }));
  });
});

describe("ErrorBoundary", () => {
  it("hides the raw error and restarts from the first screen, not the route that crashed", async () => {
    const retry = jest.fn();
    await render(<ErrorBoundary error={new Error("Cannot read property '0' of undefined")} retry={retry} />);

    expect(screen.queryByText(/Cannot read property/)).toBeNull();
    expect(screen.getByText("Please try again.")).toBeTruthy();

    await fireEvent.press(screen.getByText("Restart App"));
    expect(mockRouter.replace).toHaveBeenCalledWith("/");
    expect(retry).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace.mock.invocationCallOrder[0]).toBeLessThan(retry.mock.invocationCallOrder[0]);
  });
});
