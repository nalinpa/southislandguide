// The share-card screen. Its states: no photo, a chosen photo, the frame being rendered,
// and the post itself. The permission refusals matter most — a declined camera or library
// has to explain itself and offer Settings rather than silently doing nothing. Ported from
// rotorua-guide; the only code difference is the app name in the permission prompt.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

// A native view-shot of a real canvas; the screen only cares that it yields a uri.
const mockCaptureRef = jest.fn();
jest.mock("react-native-view-shot", () => ({ captureRef: (...args: any[]) => mockCaptureRef(...args) }));

jest.mock("@/components/share/CaptureCanvas", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  // Forwards the ref: the screen refuses to capture until shareCardRef.current exists.
  // The press exposes onImageLoad, which is what triggers the preview render.
  return {
    CaptureCanvas: React.forwardRef(({ payload, onImageLoad }: any, ref: any) =>
      React.createElement(
        View,
        { ref },
        React.createElement(
          TouchableOpacity,
          { onPress: onImageLoad, accessibilityRole: "button" },
          React.createElement(Text, null, "Canvas for " + payload.siteName),
        ),
      ),
    ),
  };
});

const mockPicker = {
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
};
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: () => mockPicker.requestCameraPermissionsAsync(),
  requestMediaLibraryPermissionsAsync: () => mockPicker.requestMediaLibraryPermissionsAsync(),
  launchCameraAsync: (o: any) => mockPicker.launchCameraAsync(o),
  launchImageLibraryAsync: (o: any) => mockPicker.launchImageLibraryAsync(o),
}));

const mockOpenSettings = jest.fn();
jest.mock("expo-linking", () => ({ openSettings: () => mockOpenSettings() }));

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 1, Error: 2 },
  ImpactFeedbackStyle: { Medium: 1 },
}));

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

const mockShare = { shareImageUriAsync: jest.fn() };
jest.mock("@/lib/services/share/shareService", () => ({
  shareService: { shareImageUriAsync: (uri: string) => mockShare.shareImageUriAsync(uri) },
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => ({ entityId: "site-1", entityName: "Sumner Beach" }),
}));

import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import * as Sentry from "@sentry/react-native";

import ShareFrameScreen from "@/app/share-frame";

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockCaptureRef.mockResolvedValue("file:///frame.png");
  mockPicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true });
  mockPicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
  mockPicker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [{ uri: "file:///camera.jpg" }] });
  mockPicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: "file:///gallery.jpg" }] });
  mockShare.shareImageUriAsync.mockResolvedValue({ ok: true });
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  alertSpy.mockRestore();
});

// The screen waits 200ms before capturing, so the frame only appears after that fires.
const letTheFrameRender = async () => {
  await act(async () => {
    jest.advanceTimersByTime(250);
  });
};

describe("before a photo is chosen", () => {
  it("names the site and asks for a photo", async () => {
    const view = await render(<ShareFrameScreen />);

    expect(view.getByText("Sumner Beach")).toBeTruthy();
    expect(view.getByText("Tap to add photo")).toBeTruthy();
    expect(view.getByText("Add a photo above to generate your frame")).toBeTruthy();
  });

  it("won't let the card be posted with nothing in it", async () => {
    const view = await render(<ShareFrameScreen />);

    await fireEvent.press(view.getByText("Post to Social"));

    expect(mockShare.shareImageUriAsync).not.toHaveBeenCalled();
  });
});

describe("choosing a photo", () => {
  it("opens the library for Gallery", async () => {
    const view = await render(<ShareFrameScreen />);

    await fireEvent.press(view.getByText("Gallery"));

    await waitFor(() => expect(mockPicker.launchImageLibraryAsync).toHaveBeenCalled());
    expect(mockPicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it("opens the camera for Camera", async () => {
    const view = await render(<ShareFrameScreen />);

    await fireEvent.press(view.getByText("Camera"));

    await waitFor(() => expect(mockPicker.launchCameraAsync).toHaveBeenCalled());
  });

  it("shows a remove control once a photo is in", async () => {
    const view = await render(<ShareFrameScreen />);

    await fireEvent.press(view.getByText("Gallery"));

    await waitFor(() => expect(view.getByLabelText("Remove photo")).toBeTruthy());
    expect(view.queryByText("Tap to add photo")).toBeNull();
  });

  it("goes back to asking for a photo once it is removed", async () => {
    const view = await render(<ShareFrameScreen />);
    await fireEvent.press(view.getByText("Gallery"));
    await waitFor(() => expect(view.getByLabelText("Remove photo")).toBeTruthy());

    await fireEvent.press(view.getByLabelText("Remove photo"));

    await waitFor(() => expect(view.getByText("Tap to add photo")).toBeTruthy());
  });

  it("keeps the previous photo when the picker is cancelled", async () => {
    mockPicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true });
    const view = await render(<ShareFrameScreen />);

    await fireEvent.press(view.getByText("Gallery"));

    await waitFor(() => expect(mockPicker.launchImageLibraryAsync).toHaveBeenCalled());
    expect(view.getByText("Tap to add photo")).toBeTruthy();
  });
});

describe("permissions", () => {
  it("explains a declined library permission and offers Settings", async () => {
    mockPicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });
    const view = await render(<ShareFrameScreen />);

    await fireEvent.press(view.getByText("Gallery"));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(alertSpy.mock.calls[0][0]).toBe("Permission Required");
    expect(alertSpy.mock.calls[0][1]).toContain("photo library");
    expect(alertSpy.mock.calls[0][1]).toContain("South Island Guide");
    expect(mockPicker.launchImageLibraryAsync).not.toHaveBeenCalled();

    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === "Open Settings")?.onPress?.();
    expect(mockOpenSettings).toHaveBeenCalled();
  });

  it("names the camera when that is what was declined", async () => {
    mockPicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false });
    const view = await render(<ShareFrameScreen />);

    await fireEvent.press(view.getByText("Camera"));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(alertSpy.mock.calls[0][1]).toContain("camera");
    expect(mockPicker.launchCameraAsync).not.toHaveBeenCalled();
  });
});

describe("rendering the frame", () => {
  it("captures the card at the social aspect ratio", async () => {
    const view = await render(<ShareFrameScreen />);

    await fireEvent.press(view.getByText("Canvas for Sumner Beach"));
    await letTheFrameRender();

    expect(mockCaptureRef).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ format: "png", width: 1080, height: 1350 }),
    );
  });

  it("reports a failed capture rather than showing a broken frame", async () => {
    mockCaptureRef.mockRejectedValue(new Error("view not ready"));
    const view = await render(<ShareFrameScreen />);

    await fireEvent.press(view.getByText("Canvas for Sumner Beach"));
    await letTheFrameRender();

    expect(Sentry.captureException).toHaveBeenCalled();
    expect(view.getByText("Add a photo above to generate your frame")).toBeTruthy();
  });
});

describe("posting", () => {
  const withRenderedFrame = async () => {
    const view = await render(<ShareFrameScreen />);
    await fireEvent.press(view.getByText("Canvas for Sumner Beach"));
    await letTheFrameRender();
    return view;
  };

  it("shares the rendered frame and confirms it", async () => {
    const view = await withRenderedFrame();

    await fireEvent.press(view.getByText("Post to Social"));
    await act(async () => {});

    expect(mockShare.shareImageUriAsync).toHaveBeenCalledWith("file:///frame.png");
    await waitFor(() => expect(view.getByText("Shared! Heading back…")).toBeTruthy());
  });

  it("leaves the screen on its own after confirming", async () => {
    const view = await withRenderedFrame();
    await fireEvent.press(view.getByText("Post to Social"));
    await act(async () => {});

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("stays put, with no success message, when the share sheet is dismissed", async () => {
    mockShare.shareImageUriAsync.mockResolvedValue({ ok: false });
    const view = await withRenderedFrame();

    await fireEvent.press(view.getByText("Post to Social"));
    await act(async () => {});

    expect(view.queryByText("Shared! Heading back…")).toBeNull();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("reports a share failure instead of claiming success", async () => {
    mockShare.shareImageUriAsync.mockRejectedValue(new Error("no sharing available"));
    const view = await withRenderedFrame();

    await fireEvent.press(view.getByText("Post to Social"));
    await act(async () => {});

    expect(Sentry.captureException).toHaveBeenCalled();
    expect(view.queryByText("Shared! Heading back…")).toBeNull();
  });
});
