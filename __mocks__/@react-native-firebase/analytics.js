// Jest stand-in for the native module: every call is a spy, nothing leaves the test.
module.exports = {
  getAnalytics: jest.fn(() => ({ __analytics: true })),
  logEvent: jest.fn(() => Promise.resolve()),
  logSignUp: jest.fn(() => Promise.resolve()),
  setAnalyticsCollectionEnabled: jest.fn(() => Promise.resolve()),
};
