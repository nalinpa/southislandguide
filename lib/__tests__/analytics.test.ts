function load(channel: string | null, dev = false) {
  jest.resetModules();
  (global as unknown as { __DEV__: boolean }).__DEV__ = dev;
  jest.doMock("expo-updates", () => ({ channel }));
  let mod!: typeof import("@/lib/analytics");
  let f!: Record<string, jest.Mock>;
  jest.isolateModules(() => {
    mod = require("@/lib/analytics");
    f = require("@react-native-firebase/analytics");
  });
  return { mod, f };
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

  it("logEvent swallows a Firebase error", async () => {
    const { mod, f } = load("production");
    f.logEvent.mockImplementationOnce(() => {
      throw new Error("native gone");
    });
    expect(() => mod.logEvent("map_opened")).not.toThrow();
    f.logEvent.mockImplementationOnce(() => Promise.reject(new Error("async gone")));
    expect(() => mod.logEvent("map_opened")).not.toThrow();
    await Promise.resolve();
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
});
