function load(channel: string | null, dev = false) {
  jest.resetModules();
  (global as unknown as { __DEV__: boolean }).__DEV__ = dev;
  jest.doMock("expo-updates", () => ({ channel }));
  let mod!: typeof import("@/lib/analytics");
  let f!: Record<string, jest.Mock>;
  let storage!: any;
  jest.isolateModules(() => {
    mod = require("@/lib/analytics");
    f = require("@react-native-firebase/analytics");
    const m = require("@react-native-async-storage/async-storage");
    storage = m.default ?? m;
  });
  return { mod, f, storage };
}

describe("analytics", () => {
  afterEach(() => {
    (global as unknown as { __DEV__: boolean }).__DEV__ = true;
  });

  it("logEvent passes the name and params to Firebase", () => {
    const { mod, f } = load("production");
    mod.logEvent("map_opened", { a: 1 });
    expect(f.logEvent).toHaveBeenCalledWith(expect.anything(), "map_opened", { a: 1 });
  });

  it("logEvent swallows a Firebase error", () => {
    const { mod, f } = load("production");
    f.logEvent.mockImplementationOnce(() => {
      throw new Error("native gone");
    });
    expect(() => mod.logEvent("map_opened")).not.toThrow();
  });

  it("logSignUp sends sign_up with its method", () => {
    const { mod, f } = load("production");
    mod.logSignUp("google");
    expect(f.logEvent).toHaveBeenCalledWith(expect.anything(), "sign_up", { method: "google" });
  });

  it("collection is on only for the production channel", () => {
    for (const [channel, dev, on] of [
      ["production", false, true],
      [null, false, false],
      ["preview", false, false],
      ["production", true, false],
    ] as const) {
      const { mod, f } = load(channel, dev);
      mod.initAnalytics();
      expect(f.setAnalyticsCollectionEnabled).toHaveBeenCalledWith(expect.anything(), on);
    }
  });

  describe("logTripThreeStops", () => {
    const flush = () => new Promise((r) => setTimeout(r, 0));

    it("logs trip_three_stops once per trip id, and stores the id", async () => {
      const { mod, f, storage } = load("production");
      await storage.clear();
      mod.logTripThreeStops("t1");
      await flush();
      mod.logTripThreeStops("t1");
      await flush();
      expect(f.logEvent).toHaveBeenCalledTimes(1);
      expect(f.logEvent).toHaveBeenCalledWith(expect.anything(), "trip_three_stops", undefined);
      expect(JSON.parse(await storage.getItem("analytics.threeStopsLogged"))).toEqual(["t1"]);
      mod.logTripThreeStops("t2");
      await flush();
      expect(f.logEvent).toHaveBeenCalledTimes(2);
    });

    it("a storage failure neither throws nor blocks", async () => {
      const { mod, f, storage } = load("production");
      storage.getItem.mockImplementationOnce(() => Promise.reject(new Error("disk")));
      expect(() => mod.logTripThreeStops("t9")).not.toThrow();
      await flush();
      expect(f.logEvent).not.toHaveBeenCalled(); // unknown if it was logged before: skip rather than repeat
    });
  });
});
