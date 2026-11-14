import { firstSentence } from "@/lib/utils/firstSentence";

describe("firstSentence", () => {
  it("keeps a short description whole", () => {
    expect(firstSentence("A long, open surf beach.")).toBe("A long, open surf beach.");
  });

  it("stops at the end of the first sentence", () => {
    expect(firstSentence("A steady climb through pine forest. The view takes in the lake.")).toBe(
      "A steady climb through pine forest.",
    );
  });

  it("doesn't take a decimal point for the end of a sentence", () => {
    expect(firstSentence("A 2.5km loop. Flat all the way.")).toBe("A 2.5km loop.");
  });

  it("cuts a long first sentence back to a comma", () => {
    const long = "The big day walk above Queenstown, climbing from the top of the gondola, through tussock and rock to a saddle.";
    expect(firstSentence(long, 80)).toBe("The big day walk above Queenstown, climbing from the top of the gondola…");
  });

  it("cuts at a whole word when there is no comma to cut at", () => {
    expect(firstSentence("One two three four five six seven eight nine ten eleven twelve", 30)).toBe(
      "One two three four five six…",
    );
  });

  it("tidies stray white space", () => {
    expect(firstSentence("  Two  spaces.\nNext line. ")).toBe("Two spaces.");
  });
});
