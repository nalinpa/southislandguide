// Directions from overseas (tester, 2026-11-14, in the US): Google can't route a drive from
// there to New Zealand, so the place itself opens instead of a route that fails.
import { Alert, Linking } from "react-native";
import * as Location from "expo-location";

import { isInNZ, openDirections, openMaps, phoneIsOutsideNZ } from "@/lib/utils/directions";

jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
}));
const perm = Location.getForegroundPermissionsAsync as jest.Mock;
const last = Location.getLastKnownPositionAsync as jest.Mock;
const at = (latitude: number, longitude: number) => ({ coords: { latitude, longitude } });

const SAN_FRANCISCO = at(37.77, -122.42);
const QUEENSTOWN = at(-45.03, 168.66);

let openURL: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  perm.mockResolvedValue({ granted: true });
  last.mockResolvedValue(QUEENSTOWN);
  openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());

describe("isInNZ", () => {
  it("takes in both islands, Stewart Island and Northland", () => {
    expect(isInNZ(-45.03, 168.66)).toBe(true); // Queenstown
    expect(isInNZ(-41.29, 174.78)).toBe(true); // Wellington
    expect(isInNZ(-35.23, 173.95)).toBe(true); // Kerikeri
    expect(isInNZ(-46.9, 168.13)).toBe(true); // Oban
  });

  it("leaves out the rest of the world", () => {
    expect(isInNZ(37.77, -122.42)).toBe(false); // San Francisco
    expect(isInNZ(-33.87, 151.21)).toBe(false); // Sydney
  });
});

describe("phoneIsOutsideNZ", () => {
  it("is yes only for a last known position overseas", async () => {
    last.mockResolvedValue(SAN_FRANCISCO);
    expect(await phoneIsOutsideNZ()).toBe(true);
    last.mockResolvedValue(QUEENSTOWN);
    expect(await phoneIsOutsideNZ()).toBe(false);
  });

  it("never asks for location, and says no when it can't tell", async () => {
    perm.mockResolvedValue({ granted: false });
    last.mockResolvedValue(SAN_FRANCISCO);
    expect(await phoneIsOutsideNZ()).toBe(false);
    expect(last).not.toHaveBeenCalled();

    perm.mockResolvedValue({ granted: true });
    last.mockResolvedValue(null);
    expect(await phoneIsOutsideNZ()).toBe(false);

    last.mockRejectedValue(new Error("no fix"));
    expect(await phoneIsOutsideNZ()).toBe(false);
  });
});

describe("openDirections", () => {
  it("routes from the phone in New Zealand", async () => {
    await openDirections(-45.0, 168.7);
    expect(openURL).toHaveBeenCalledWith("https://www.google.com/maps/dir/?api=1&destination=-45,168.7");
  });

  it("opens the place itself from overseas", async () => {
    last.mockResolvedValue(SAN_FRANCISCO);
    await openDirections(-45.0, 168.7);
    expect(openURL).toHaveBeenCalledWith("https://www.google.com/maps/search/?api=1&query=-45,168.7");
  });

  it("does nothing until the place's position has loaded", async () => {
    await openDirections(undefined, 168.7);
    await openDirections(-45.0, null);
    expect(openURL).not.toHaveBeenCalled();
  });
});

it("says so when Maps doesn't open", async () => {
  openURL.mockRejectedValue(new Error("no handler"));
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await openMaps("https://www.google.com/maps");
  expect(alert).toHaveBeenCalledWith("Couldn't Open", expect.any(String));
});
