module.exports = {
  preset: "jest-expo",
  moduleNameMapper: {
    // Tests run against fixed drive times (the ones the planner was designed around),
    // not whatever scripts/generate-drive-times.js last wrote: the times are data, and a
    // fresh run mustn't change what the tests mean. lib/__tests__/areas.test.ts reads the
    // real file by its path to check every pair has a time. Must come before "^@/".
    "^@/assets/data/area-drive-minutes\.json$": "<rootDir>/test/fixtures/area-drive-minutes.json",
    // Likewise the hubs and far-out places' own times: none, unless a test mocks its own.
    "^@/assets/data/(area-hubs|far-place-minutes)\.json$": "<rootDir>/test/fixtures/$1.json",
    "^@/(.*)$": "<rootDir>/$1",
  },
  // The first render in a UI suite pays for the whole react-native module graph and can
  // take several seconds on its own — enough to cross the 5s default once jest is running
  // suites in parallel. Raises the ceiling only; nothing here waits on a timer.
  testTimeout: 20000,
};
