import { describe, it, expect } from "vitest";
import type { Prisma } from "@prisma/client";
import { parseListingFilters, buildListingWhere, buildOrderBy, buildQuery } from "../listingQuery";

describe("parseListingFilters", () => {
  it("parses a full query string's worth of params", () => {
    const f = parseListingFilters({ q: "iphone", min: "1000", max: "50000", sort: "price_asc", page: "2", f_storage: "64gb,128gb" });
    expect(f).toMatchObject({ q: "iphone", min: 1000, max: 50000, sort: "price_asc", page: 2 });
    expect(f.attrs.storage).toEqual(["64gb", "128gb"]);
  });

  it("falls back to safe defaults for garbage input (never throws on a crafted URL)", () => {
    const f = parseListingFilters({ min: "not-a-number", page: "-5", sort: "'; DROP TABLE products; --" });
    expect(f.min).toBeNull();
    expect(f.page).toBe(1);
    expect(f.sort).toBe("newest");
  });

  it("rejects attribute/option ids with unsafe characters instead of passing them to Prisma", () => {
    const f = parseListingFilters({ "f_evil' OR 1=1": "x", f_storage: "ok-id,bad id!,<script>" });
    expect(f.attrs["evil' OR 1=1"]).toBeUndefined();
    expect(f.attrs.storage).toEqual(["ok-id"]);
  });

  it("caps page within a sane range", () => {
    expect(parseListingFilters({ page: "99999" }).page).toBe(1);
  });
});

describe("buildListingWhere", () => {
  it("only applies attribute filters the category actually allows", () => {
    const where = buildListingWhere(
      { q: null, min: null, max: null, loc: null, cat: null, sort: "newest", page: 1, attrs: { storage: ["64gb"], foreign: ["x"] } },
      { allowedAttributeIds: new Set(["storage"]) }
    );
    const and = where.AND as Prisma.ProductWhereInput[];
    expect(and).toHaveLength(1); // "foreign" was silently dropped
    expect(and[0]?.attributeValues?.some?.attributeId).toBe("storage");
  });

  it("prefers resolved search ids over a raw text search once Meilisearch has answered", () => {
    const where = buildListingWhere(
      { q: "phone", min: null, max: null, loc: null, cat: null, sort: "newest", page: 1, attrs: {} },
      { searchIds: ["id1", "id2"] }
    );
    expect((where.AND as Prisma.ProductWhereInput[])[0]).toEqual({ id: { in: ["id1", "id2"] } });
  });

  it("always scopes to PUBLISHED listings", () => {
    const where = buildListingWhere({ q: null, min: null, max: null, loc: null, cat: null, sort: "newest", page: 1, attrs: {} }, {});
    expect(where.status).toBe("PUBLISHED");
  });
});

describe("buildOrderBy", () => {
  it("defaults to boosted-first, then newest", () => {
    expect(buildOrderBy("newest")).toEqual([{ boostedUntil: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }]);
  });
});

describe("buildQuery", () => {
  it("round-trips existing params and applies overrides", () => {
    expect(buildQuery({ q: "x", page: "2" }, { page: "3" })).toBe("?q=x&page=3");
  });
  it("removes a key when its override is null", () => {
    expect(buildQuery({ q: "x", min: "10" }, { min: null })).toBe("?q=x");
  });
  it("returns an empty string (no bare '?') when nothing remains", () => {
    expect(buildQuery({ a: "1" }, { a: null })).toBe("");
  });
});
