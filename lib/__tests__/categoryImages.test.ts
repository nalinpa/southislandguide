// siteImage: the place's own photo if it has one, otherwise its primary category's bundled
// default (bundled so it still shows offline), otherwise null so callers keep their
// placeholder.
import fs from "fs";
import path from "path";

import { siteImage } from "@/lib/categoryImages";
import { SITE_CATEGORIES } from "@/lib/models";
import { PLACE_IMAGE_TYPES } from "@/lib/placeImageTypes";

// jest-expo turns a required asset into { testUri: "<path>" }, so the file it picked is
// visible here.
const file = (src: unknown) => (src as { testUri?: string } | null)?.testUri ?? "";

describe("siteImage", () => {
  it("prefers the place's own photo, at either size", () => {
    expect(siteImage("https://img/x.webp", "Food", "full")).toEqual({ uri: "https://img/x.webp" });
    expect(siteImage("https://img/x.webp", "Food", "thumb")).toEqual({ uri: "https://img/x.webp" });
  });

  it("uses the photo even when the category is missing", () => {
    expect(siteImage("https://img/x.webp", null, "full")).toEqual({ uri: "https://img/x.webp" });
  });

  it.each([null, undefined, ""])("falls back to the category's full-size default when the url is %p", (url) => {
    expect(file(siteImage(url, "Walks", "full"))).toMatch(/categories\/full\/Walks\.webp$/);
  });

  it("falls back to the thumbnail when a thumbnail was asked for", () => {
    expect(file(siteImage(null, "Walks", "thumb"))).toMatch(/categories\/thumb\/Walks\.webp$/);
  });

  it("has both defaults for every category", () => {
    for (const c of SITE_CATEGORIES) {
      expect(file(siteImage(null, c, "full"))).toMatch(new RegExp(`categories/full/${c}\\.webp$`));
      expect(file(siteImage(null, c, "thumb"))).toMatch(new RegExp(`categories/thumb/${c}\\.webp$`));
    }
  });

  it("returns null with neither a photo nor a category", () => {
    expect(siteImage(null, null, "full")).toBeNull();
    expect(siteImage(undefined, undefined, "thumb")).toBeNull();
  });

  it("returns null for a category it has no default for", () => {
    expect(siteImage(null, "Spaceport" as any, "full")).toBeNull();
  });

  it("shows a listed place's type default ahead of its category's", () => {
    expect(file(siteImage(null, "Stay", "full", "te-anau-central-backpackers"))).toMatch(/types\/full\/dorm\.webp$/);
    expect(file(siteImage(null, "Stay", "thumb", "te-anau-central-backpackers"))).toMatch(/types\/thumb\/dorm\.webp$/);
  });

  it("still prefers the place's own photo over its type's", () => {
    expect(siteImage("https://img/x.webp", "Stay", "full", "te-anau-central-backpackers")).toEqual({
      uri: "https://img/x.webp",
    });
  });

  it("keeps the category default for a place with no type", () => {
    expect(file(siteImage(null, "Food", "full", "barrys-bay-cheese"))).toMatch(/categories\/full\/Food\.webp$/);
  });
});

describe("PLACE_IMAGE_TYPES", () => {
  // Every place file, so a typo or a renamed slug shows up here, not as a quiet fallback.
  const dataDir = path.join(__dirname, "../../assets/data");
  const ids = new Set(
    fs
      .readdirSync(dataDir)
      .filter((f) => /_places(_all)?\.json$/.test(f))
      .flatMap((f) => JSON.parse(fs.readFileSync(path.join(dataDir, f), "utf8")) as { slug: string }[])
      .map((p) => p.slug),
  );
  const listed = Object.values(PLACE_IMAGE_TYPES).flat();

  it("lists only places that exist", () => {
    expect(listed.filter((id) => !ids.has(id))).toEqual([]);
  });

  it("puts each place under one type only", () => {
    expect(listed.filter((id, i) => listed.indexOf(id) !== i)).toEqual([]);
  });
});
