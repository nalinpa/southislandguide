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
  const Stack = ({ children }: any) => children;
  Stack.Screen = () => null;
  return {
    Stack,
    useNavigationContainerRef: () => ({}),
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
jest.mock("@/lib/tour/SpotlightOverlay", () => ({
  SpotlightOverlay: () => require("react").createElement(require("react-native").Text, null, "tour overlay"),
}));

const mockRequestReview = jest.fn();
let mockOpenCount: number | null = null;

import React from "react";
import { render, act, screen } from "@testing-library/react-native";

// Import after mocks are set up.
import RootLayout from "../_layout";

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
