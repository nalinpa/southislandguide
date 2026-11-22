// Stands in for react-native in pack.js only, so lib/ui/tokens.ts's pair(light, dark) returns
// { light, dark } (iOS's two-sided colour, DARK_READY on) for the site to read. Nothing else may use it.
export const Platform = { OS: "ios" };
export const DynamicColorIOS = (c: { light: string; dark: string }) => c;
