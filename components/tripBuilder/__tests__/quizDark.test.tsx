// The trip quiz in dark (stage 8 of docs/plans/app-trip-builder.md). Tests read a paired colour as its light side
// (test/lightColors.js); here every pair is read as its dark side, as a phone set to dark draws it, and the light
// sides are kept. No part of any step may still wear a colour only light mode has, but what is on a photo or on a
// fill made for white words: those are the same in light and dark.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));
jest.mock("expo-image", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Image = (props: any) => React.createElement(View, props);
  Image.prefetch = () => Promise.resolve(true);
  return { Image };
});
jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { LinearGradient: (p: any) => React.createElement(View, p) };
});
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
// The form is the engine's sign-in, the login screen's, checked in dark with it: here, the step's own words.
jest.mock("@/components/auth/SignInForm", () => ({ SignInForm: () => null }));
jest.mock("@/lib/hooks/useAuthForm", () => ({ useAuthForm: () => ({ mode: "signup" }) }));

import React from "react";
import { StyleSheet, View } from "react-native";
import { render } from "@testing-library/react-native";

// Every light side and every dark side, as the colours are made.
const lights = new Set<string>();
const darks = new Set<string>();
Object.defineProperty(require("react-native"), "DynamicColorIOS", {
  configurable: true,
  value: ({ light, dark }: { light: string; dark: string }) => {
    lights.add(light);
    darks.add(dark);
    return dark;
  },
});
/* eslint-disable @typescript-eslint/no-require-imports */
const { tokens } = require("@/lib/ui/tokens");
const Q = require("@/components/tripBuilder/QuizSteps");
const { QuizHeader } = require("@/components/tripBuilder/quizParts");
const { AccountStep } = require("@/components/tripBuilder/AccountStep");
const { blankQuiz } = require("@/lib/tripBuilder/quizFlow");
const { quizTrips } = require("@/lib/tripBuilder/quizTrips");
const site = require("@/lib/tripBuilder/quizLogic");
const data = require("@/assets/data/builder-data.json");
/* eslint-enable @typescript-eslint/no-require-imports */

const TODAY = new Date(2026, 10, 27);
// A long weekend's loop from Queenstown in January, every answer given (each step shows its answer picked).
const ALL = {
  ...blankQuiz(),
  start: "queenstown",
  band: "weekend",
  days: 4,
  end: "queenstown",
  season: "summer",
  month: { month: 0, year: 2027 },
  pace: "some",
  drive: 240,
  who: "couple",
  age: "30-44",
  vibes: ["nature", "relax"],
  into: ["Scenic"],
  activities: ["wine"],
  food: true,
};
const noop = () => {};

// A colour only light mode has: a light side that is no dark side too (the dark page's words are light mode's pale
// fill, so that one can't tell).
const lightOnly = () => new Set([...lights].filter((c) => !darks.has(c)));
// What carries white words in light and dark alike, so what is on it isn't looked at: a photo's dark fill, and the
// fills made for white words (tokens.ts: the red fill, which stays light's red in dark, the success and accent fills,
// the main button's orange).
const WHITE_WORDS = () =>
  new Set([tokens.colors.scrim, tokens.colors.dangerFill, tokens.colors.success, tokens.colors.accent, tokens.button.primary.bg]);
// Every colour drawn that only light mode has, with where.
function lightColours(node: any, onFill = false, found: string[] = []): string[] {
  if (!node || typeof node === "string") return found;
  if (Array.isArray(node)) {
    for (const n of node) lightColours(n, onFill, found);
    return found;
  }
  const style = (StyleSheet.flatten(node.props.style) ?? {}) as Record<string, unknown>;
  const fill = onFill || WHITE_WORDS().has(style.backgroundColor);
  if (!fill) {
    const light = lightOnly();
    for (const [key, value] of Object.entries(style)) {
      if (/color$/i.test(key) && typeof value === "string" && light.has(value)) found.push(`${node.type} ${key} ${value}`);
    }
    for (const c of node.props.colors ?? []) if (light.has(c)) found.push(`${node.type} gradient ${c}`);
  }
  for (const child of node.children ?? []) lightColours(child, fill, found);
  return found;
}

const STEPS: [string, React.ReactElement][] = [
  ["the start, every town showing", <Q.StartStep state={ALL} onAnswer={noop} open onOpen={noop} />],
  ["the length", <Q.BandStep state={ALL} onAnswer={noop} />],
  ["the days", <Q.DaysStep state={ALL} onAnswer={noop} />],
  ["the finish, every town showing", <Q.FinishStep state={ALL} onAnswer={noop} open onOpen={noop} />],
  ["the first photo break", <Q.BreakStep state={ALL} onAnswer={noop} />],
  ["the season", <Q.SeasonStep state={ALL} onAnswer={noop} />],
  ["the month", <Q.MonthStep state={ALL} onAnswer={noop} today={TODAY} />],
  ["how active", <Q.PaceStep state={ALL} onAnswer={noop} />],
  ["the driving", <Q.DriveStep state={ALL} onAnswer={noop} />],
  ["who", <Q.WhoStep state={ALL} onAnswer={noop} />],
  ["how old", <Q.AgeStep state={ALL} onAnswer={noop} />],
  ["the vibe", <Q.VibeStep state={ALL} onAnswer={noop} />],
  ["the second photo break", <Q.Break2Step state={ALL} onAnswer={noop} today={TODAY} />],
  ["the swipe cards", <Q.IntoStep state={ALL} onAnswer={noop} deck={null} onDeck={noop} today={TODAY} />],
  ["food", <Q.FoodStep state={ALL} onAnswer={noop} />],
  ["the account step", <AccountStep />],
  ["the wait", <Q.WaitStep />],
  ["a build that failed", <Q.WaitStep failed onAgain={noop} />],
  ["the top row", <QuizHeader progress={42} onBack={noop} onClose={noop} />],
  // Over the second photo break, which is the screen's dark fill.
  [
    "the top row on the photo",
    <View style={{ backgroundColor: tokens.colors.scrim }}>
      <QuizHeader progress={67} onBack={noop} onClose={noop} onPhoto />
    </View>,
  ],
];

describe("the quiz in dark", () => {
  // The check itself: the colours are dark, and light mode's words and white cards are among what it looks for.
  it("knows light mode's colours to look for", () => {
    expect(tokens.colors.bgCard).toBe("#0E2A2E");
    expect(tokens.colors.text).toBe("#EEF6F3");
    expect(lightOnly().has("#0A1F1B")).toBe(true);
    expect(lightOnly().has("#FFFFFF")).toBe(true);
  });

  it.each(STEPS)("draws %s in dark colours only", async (_name, step) => {
    const view = await render(step);

    expect(lightColours(view.toJSON())).toEqual([]);
  });

  it("draws the trip cards in dark colours only, one picked, one being saved and the rest held", async () => {
    const trips = quizTrips(ALL, TODAY);
    expect(trips.length).toBeGreaterThan(0);
    const view = await render(
      <Q.ChoiceStep state={{ ...ALL, pick: trips[0].key }} trips={trips} onAnswer={noop} saving={trips[0].key} offline onAgain={noop} />,
    );

    expect(lightColours(view.toJSON())).toEqual([]);
  });

  // Each of the website's swipe cards for every month, in case one has a look of its own.
  it("draws every month's first swipe card in dark colours only", async () => {
    for (let month = 0; month < 12; month++) {
      expect(site.cardsFor(data, month).length).toBeGreaterThan(0);
      const view = await render(<Q.IntoStep state={{ ...ALL, month: { month, year: 2027 } }} onAnswer={noop} deck={null} onDeck={noop} today={TODAY} />);
      expect(lightColours(view.toJSON())).toEqual([]);
      await view.unmount();
    }
  });
});
