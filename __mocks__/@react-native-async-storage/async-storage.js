// The library's own Jest stand-in, for every test: lib/analytics.ts keeps a list in storage,
// so any suite that reaches it would otherwise hit the missing native module.
module.exports = require("@react-native-async-storage/async-storage/jest/async-storage-mock");
