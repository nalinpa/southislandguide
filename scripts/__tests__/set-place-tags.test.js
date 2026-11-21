// buildUpdates: one { slug, data: { vibe, activities } } per slug, nothing else touched,
// and a throw on a value outside the registry options or on an empty vibe.
const { buildUpdates, missingSlugs } = require("../set-place-tags");

const options = { vibe: ["relax", "nature"], activities: ["surfing", "wine"] };

describe("buildUpdates", () => {
  it("returns one update per slug with only vibe and activities", () => {
    const tags = {
      "a-place": { vibe: ["relax"], activities: ["wine"], name: "ignored" },
      "b-place": { vibe: ["nature", "relax"], activities: [] },
    };
    expect(buildUpdates(tags, options)).toEqual([
      { slug: "a-place", data: { vibe: ["relax"], activities: ["wine"] } },
      { slug: "b-place", data: { vibe: ["nature", "relax"], activities: [] } },
    ]);
  });

  it("throws on a vibe not in the options", () => {
    expect(() => buildUpdates({ x: { vibe: ["chill"], activities: [] } }, options)).toThrow(/chill/);
  });

  it("throws on an activity not in the options", () => {
    expect(() => buildUpdates({ x: { vibe: ["relax"], activities: ["bungy"] } }, options)).toThrow(/bungy/);
  });

  it("throws on an empty vibe", () => {
    expect(() => buildUpdates({ x: { vibe: [], activities: [] } }, options)).toThrow(/vibe/);
  });
});

describe("missingSlugs", () => {
  it("lists the slugs with no doc in the live list, by doc id", () => {
    const updates = [{ slug: "a-place" }, { slug: "gone-place" }, { slug: "b-slug" }];
    const live = [{ id: "a-place" }, { id: "XyZ123", slug: "b-slug" }];
    expect(missingSlugs(updates, live)).toEqual(["gone-place", "b-slug"]);
  });

  it("is empty when every slug is live", () => {
    expect(missingSlugs([{ slug: "a" }], [{ id: "a" }, { id: "b" }])).toEqual([]);
  });
});
