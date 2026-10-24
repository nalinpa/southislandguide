// The photo at the top of a place's page, and the credit some photos must carry: the
// image libraries' licences (Tourism New Zealand's, Great South's) require the photographer
// to be named. Only over the place's own photo: a category's stand-in photo is the app's own.

import React from "react";
import { render } from "@testing-library/react-native";

import { Hero } from "@/components/sites/detail/Hero";

it("names the photographer over the place's own photo", async () => {
  const view = await render(<Hero imageUrl="https://example.test/lake.webp" imageCredit="Miles Holden" category="Scenic" />);

  expect(view.getByText("Photo: Miles Holden")).toBeTruthy();
});

it("names them over a place that only has a thumbnail", async () => {
  const view = await render(
    <Hero imageThumbnailUrl="https://example.test/lake-thumb.webp" imageCredit="Susan Miller Photography" category="Scenic" />,
  );

  expect(view.getByText("Photo: Susan Miller Photography")).toBeTruthy();
});

it("credits nobody over a category's stand-in photo", async () => {
  const view = await render(<Hero imageCredit="Miles Holden" category="Scenic" />);

  expect(view.queryByText(/^Photo:/)).toBeNull();
});

it("shows no credit for a photo that has none", async () => {
  const view = await render(<Hero imageUrl="https://example.test/lake.webp" imageCredit="  " category="Scenic" />);

  expect(view.queryByText(/^Photo:/)).toBeNull();
});
