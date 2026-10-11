import { describe, it, expect } from "vitest";
import { normalize, rankDocuments } from "./fuzzy";

const docs = [
  { id: "phone", fields: [{ text: "آيفون 13 برو 256 جيجا", weight: 1 }, { text: "موبايلات Mobile Phones", weight: 0.9 }] },
  { id: "car", fields: [{ text: "هيونداي إلنترا 2020", weight: 1 }, { text: "سيارات Cars", weight: 0.9 }] },
  { id: "tv", fields: [{ text: "شاشة سامسونج 55 بوصة", weight: 1 }, { text: "تلفزيونات TVs", weight: 0.9 }] },
];

describe("fuzzy search", () => {
  it("normalises Arabic letters", () => {
    expect(normalize("أَحمد إبراهيم ة")).toBe("احمد ابراهيم ه");
  });
  it("finds Arabic category word via English query (synonyms)", () => {
    expect(rankDocuments("mobile", docs)[0]).toBe("phone");
    expect(rankDocuments("موبايل", docs)[0]).toBe("phone");
  });
  it("tolerates typos and prefixes", () => {
    expect(rankDocuments("samsnug", [{ id: "s", fields: [{ text: "Samsung Galaxy", weight: 1 }] }])).toEqual(["s"]);
    expect(rankDocuments("هيون", docs)[0]).toBe("car");
  });
  it("returns nothing for gibberish", () => {
    expect(rankDocuments("zzzzqqq", docs)).toEqual([]);
  });
});
