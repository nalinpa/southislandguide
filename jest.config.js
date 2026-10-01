module.exports = {
  preset: "jest-expo",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  // The first render in a UI suite pays for the whole react-native module graph and can
  // take several seconds on its own — enough to cross the 5s default once jest is running
  // suites in parallel. Raises the ceiling only; nothing here waits on a timer.
  testTimeout: 20000,
};
