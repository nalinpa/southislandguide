// The map wrapper. react-native-maps and react-native-map-clustering are native, so the
// map itself is stood in — what is testable here is the region maths, one marker per site,
// and the imperative recenter/focus the map controls drive.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

const mockMapRef = { animateToRegion: jest.fn(), setMapBoundaries: jest.fn() };
const mockClusterProps: any = { current: null };
jest.mock("react-native-map-clustering", () => {
  const React = require("react");
  const { View } = require("react-native");
  // Captures the props the wrapper passes down and hands the wrapper a stand-in map ref.
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      mockClusterProps.current = props;
      React.useImperativeHandle(ref, () => mockMapRef);
      return React.createElement(View, null, props.children);
    }),
  };
});
jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => null,
    Marker: ({ children, onPress }: any) => React.createElement(View, { onPress }, children),
  };
});

import React from "react";
import { render } from "@testing-library/react-native";

import { SitesMapView, initialRegionFrom } from "@/components/map/SitesMapView";
import type { SitesMapViewHandle } from "@/components/map/SitesMapView";

const sites = [
  { id: "s1", name: "Wai-O-Tapu", lat: -38.35, lng: 176.36, category: "Walks" as const },
  { id: "s2", name: "Hell's Gate", lat: -38.05, lng: 176.42, category: "Water" as const },
];

const region = { latitude: -38.1, longitude: 176.2, latitudeDelta: 0.2, longitudeDelta: 0.2 };

beforeEach(() => {
  jest.clearAllMocks();
  mockClusterProps.current = null;
});

describe("initialRegionFrom", () => {
  it("centres tightly on the user when their position is known", () => {
    const r = initialRegionFrom(-38.14, 176.25, sites);

    expect(r.latitude).toBe(-38.14);
    expect(r.longitude).toBe(176.25);
    expect(r.latitudeDelta).toBe(0.08);
  });

  it("frames every site when there is no user position", () => {
    const r = initialRegionFrom(null, null, sites);

    expect(r.latitude).toBeCloseTo((-38.35 + -38.05) / 2, 5);
    expect(r.longitude).toBeCloseTo((176.36 + 176.42) / 2, 5);
    // Padded by 20% so the outermost pins aren't on the edge.
    expect(r.latitudeDelta).toBeCloseTo(0.3 * 1.2, 5);
  });

  it("keeps a floor on the zoom, so a single site isn't framed absurdly tight", () => {
    const r = initialRegionFrom(null, null, [sites[0]]);

    expect(r.latitudeDelta).toBe(0.12);
    expect(r.longitudeDelta).toBe(0.12);
  });

  it("falls back to central Christchurch with neither a position nor sites", () => {
    const r = initialRegionFrom(null, null, []);

    expect(r.latitude).toBeCloseTo(-43.5321, 4);
    expect(r.longitude).toBeCloseTo(172.6362, 4);
  });
});

describe("the map", () => {
  it("draws one marker per site", async () => {
    await render(
      <SitesMapView sites={sites} initialRegion={region} selectedSiteId={null} mapType="standard" onPressSite={jest.fn()} />,
    );

    expect(mockClusterProps.current.children.flat().filter(Boolean)).toHaveLength(2);
  });

  it("passes the region and map type straight through", async () => {
    await render(
      <SitesMapView sites={sites} initialRegion={region} selectedSiteId={null} mapType="satellite" onPressSite={jest.fn()} />,
    );

    expect(mockClusterProps.current.initialRegion).toBe(region);
    expect(mockClusterProps.current.mapType).toBe("satellite");
  });

  it("fences the map to the coverage area once it is ready", async () => {
    await render(
      <SitesMapView sites={sites} initialRegion={region} selectedSiteId={null} mapType="standard" onPressSite={jest.fn()} />,
    );

    mockClusterProps.current.onMapReady();

    expect(mockMapRef.setMapBoundaries).toHaveBeenCalledWith(
      { latitude: -43.35, longitude: 172.85 },
      { latitude: -43.7, longitude: 172.4 },
    );
  });

  it("zooms to a newly selected site", async () => {
    const view = await render(
      <SitesMapView sites={sites} initialRegion={region} selectedSiteId={null} mapType="standard" onPressSite={jest.fn()} />,
    );

    await view.rerender(
      <SitesMapView sites={sites} initialRegion={region} selectedSiteId="s2" mapType="standard" onPressSite={jest.fn()} />,
    );

    expect(mockMapRef.animateToRegion).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: -38.05, longitude: 176.42 }),
      expect.any(Number),
    );
  });

  it("doesn't re-zoom when the same site is still selected after a refetch", async () => {
    const view = await render(
      <SitesMapView sites={sites} initialRegion={region} selectedSiteId="s2" mapType="standard" onPressSite={jest.fn()} />,
    );
    expect(mockMapRef.animateToRegion).toHaveBeenCalledTimes(1);

    // A refetch hands back an equal-but-new array; the user's own zoom must survive it.
    await view.rerender(
      <SitesMapView sites={[...sites]} initialRegion={region} selectedSiteId="s2" mapType="standard" onPressSite={jest.fn()} />,
    );

    expect(mockMapRef.animateToRegion).toHaveBeenCalledTimes(1);
  });

  it("ignores a selection for a site that isn't on the map", async () => {
    await render(
      <SitesMapView sites={sites} initialRegion={region} selectedSiteId="missing" mapType="standard" onPressSite={jest.fn()} />,
    );

    expect(mockMapRef.animateToRegion).not.toHaveBeenCalled();
  });
});

describe("the imperative handle", () => {
  it("recenters at a wider zoom than it focuses", async () => {
    const ref = React.createRef<SitesMapViewHandle>();
    await render(
      <SitesMapView
        ref={ref}
        sites={sites}
        initialRegion={region}
        selectedSiteId={null}
        mapType="standard"
        onPressSite={jest.fn()}
      />,
    );

    ref.current!.recenter(-38.14, 176.25);
    const recenterDelta = mockMapRef.animateToRegion.mock.calls[0][0].latitudeDelta;

    ref.current!.focusOn(-38.14, 176.25);
    const focusDelta = mockMapRef.animateToRegion.mock.calls[1][0].latitudeDelta;

    expect(focusDelta).toBeLessThan(recenterDelta);
  });

  it("recenters on the coordinates it was given", async () => {
    const ref = React.createRef<SitesMapViewHandle>();
    await render(
      <SitesMapView
        ref={ref}
        sites={sites}
        initialRegion={region}
        selectedSiteId={null}
        mapType="standard"
        onPressSite={jest.fn()}
      />,
    );

    ref.current!.recenter(-38.14, 176.25);

    expect(mockMapRef.animateToRegion).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: -38.14, longitude: 176.25 }),
      expect.any(Number),
    );
  });
});
