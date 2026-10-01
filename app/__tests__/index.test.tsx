// The app's entry route. It only ever redirects — the (auth) and (app) layouts decide where
// a resolved session actually lands, so a session check here would be a second, conflicting
// source of truth.

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { Redirect: ({ href }: any) => React.createElement(Text, null, "Redirect to " + href) };
});

import React from "react";
import { render } from "@testing-library/react-native";

import Index from "@/app/index";

it("sends the first launch to the login screen", async () => {
  const view = await render(<Index />);

  expect(view.getByText("Redirect to /(auth)/login")).toBeTruthy();
});
