// The map pin. Its only decision is the icon and colour for a category, and the fallback
// when the category isn't one the app knows — a site whose category the api has renamed
// must still draw a pin rather than crashing the map. south-island keys the config by
// category id (rotorua-guide keyed it by label once, and renamed categories fell back to
// `other` silently), and has its own nine ids.

import React from "react";
import { render } from "@testing-library/react-native";

import { SiteMarker, CATEGORY_CONFIG } from "@/components/map/SiteMarker";
import { SITE_CATEGORIES } from "@/lib/models";

// The teal that marks the selected item elsewhere on the map; a category sharing it
// would read as "selected".
const SELECTION_TEAL = "#095C65";

const drawn = (el: React.ReactElement) => render(el).then((view) => JSON.stringify(view.toJSON()));

it("has an icon and a colour for every category the app ships", () => {
  for (const category of SITE_CATEGORIES) {
    expect(CATEGORY_CONFIG[category]).toBeDefined();
    expect(CATEGORY_CONFIG[category].Icon).toBeDefined();
    expect(CATEGORY_CONFIG[category].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  }
});

it("gives each category, the fallback and the selection teal their own colour", () => {
  const colors = [...SITE_CATEGORIES.map((c) => CATEGORY_CONFIG[c].color), CATEGORY_CONFIG.other.color, SELECTION_TEAL];
  expect(new Set(colors.map((c) => c.toUpperCase())).size).toBe(colors.length);
});

it("rings the pin in its category's colour", async () => {
  expect(await drawn(<SiteMarker selected={false} category="Food" />)).toContain(CATEGORY_CONFIG.Food.color);
});

it("draws an unknown category with the fallback instead of crashing the map", async () => {
  const json = await drawn(<SiteMarker selected={false} category={"Spaceport" as any} />);
  expect(json).toContain(CATEGORY_CONFIG.other.color);
});

it("uses the fallback when no category is given", async () => {
  expect(await drawn(<SiteMarker selected={false} />)).toContain(CATEGORY_CONFIG.other.color);
});

it("enlarges the selected pin", async () => {
  const plain = await drawn(<SiteMarker selected={false} category="Walks" />);
  const selected = await drawn(<SiteMarker selected category="Walks" />);

  expect(plain).not.toContain('"scale":1.15');
  expect(selected).toContain('"scale":1.15');
});

it("adds a badge only to a completed pin", async () => {
  const plain = JSON.parse(await drawn(<SiteMarker selected={false} category="Walks" />));
  const done = JSON.parse(await drawn(<SiteMarker selected={false} completed category="Walks" />));

  expect(plain.children).toHaveLength(1);
  expect(done.children).toHaveLength(2);
});
