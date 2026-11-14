// Tests check the light look. A paired colour (pair() in lib/ui/tokens.ts, iOS's
// DynamicColorIOS) is its light side here, so colours stay strings a test can read and
// measure. Dark is checked on the phone (prompts/dark-mode.md).
const RN = require("react-native");

Object.defineProperty(RN, "DynamicColorIOS", { configurable: true, value: ({ light }) => light });
