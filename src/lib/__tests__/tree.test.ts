import { describe, it, expect } from "vitest";
import { buildTree, descendantIds, ancestorChain, isReachable, hasChildren, wouldCreateCycle, depthOf, findPath } from "../tree";

// Fashion > Men > Shoes > Sports Shoes   (4 levels — the exact case asked about)
// Fashion > Women
// Real Estate > For Sale > Apartments
// Real Estate > For Rent          (For Rent has no children)
// Orphan has a parentId pointing at a node NOT in the active list (simulates a hidden ancestor)
const flat = [
  { id: "fashion", parentId: null, sortOrder: 0 },
  { id: "men", parentId: "fashion", sortOrder: 0 },
  { id: "women", parentId: "fashion", sortOrder: 1 },
  { id: "shoes", parentId: "men", sortOrder: 0 },
  { id: "sports-shoes", parentId: "shoes", sortOrder: 0 },
  { id: "realestate", parentId: null, sortOrder: 1 },
  { id: "forsale", parentId: "realestate", sortOrder: 0 },
  { id: "apartments", parentId: "forsale", sortOrder: 0 },
  { id: "forrent", parentId: "realestate", sortOrder: 1 },
  { id: "orphan", parentId: "missing-parent", sortOrder: 0 },
];

describe("buildTree", () => {
  it("nests to 4 levels (category > sub > sub-sub > sub-sub-sub)", () => {
    const tree = buildTree(flat);
    const fashion = tree.find((n) => n.id === "fashion")!;
    const men = fashion.children.find((n) => n.id === "men")!;
    const shoes = men.children.find((n) => n.id === "shoes")!;
    expect(shoes.children.map((n) => n.id)).toEqual(["sports-shoes"]);
  });

  it("drops a node whose parent isn't in the active list (orphan never appears as top-level)", () => {
    const tree = buildTree(flat);
    expect(tree.find((n) => n.id === "orphan")).toBeUndefined();
  });

  it("sorts siblings by sortOrder", () => {
    const tree = buildTree(flat);
    const fashion = tree.find((n) => n.id === "fashion")!;
    expect(fashion.children.map((n) => n.id)).toEqual(["men", "women"]);
  });
});

describe("descendantIds", () => {
  it("includes every depth below a node, not just direct children", () => {
    expect(descendantIds(flat, "fashion").sort()).toEqual(["fashion", "men", "shoes", "sports-shoes", "women"].sort());
  });
  it("returns just the leaf itself when it has no children", () => {
    expect(descendantIds(flat, "sports-shoes")).toEqual(["sports-shoes"]);
  });
  it("can exclude the node itself", () => {
    expect(descendantIds(flat, "fashion", false).sort()).toEqual(["men", "shoes", "sports-shoes", "women"].sort());
  });
});

describe("ancestorChain / isReachable", () => {
  it("returns root-to-node order", () => {
    expect(ancestorChain(flat, "sports-shoes").map((n) => n.id)).toEqual(["fashion", "men", "shoes", "sports-shoes"]);
  });
  it("a node with a missing ancestor is NOT reachable", () => {
    expect(isReachable(flat, "orphan")).toBe(false);
  });
  it("a normal leaf IS reachable", () => {
    expect(isReachable(flat, "apartments")).toBe(true);
  });
});

describe("hasChildren (leaf detection — what a seller must reach to post)", () => {
  it("Fashion is not postable (has children)", () => expect(hasChildren(flat, "fashion")).toBe(true));
  it("Sports Shoes IS postable (true leaf)", () => expect(hasChildren(flat, "sports-shoes")).toBe(false));
  it("For Rent IS postable (leaf with no further sub-categories)", () => expect(hasChildren(flat, "forrent")).toBe(false));
});

describe("wouldCreateCycle (admin move-category guard)", () => {
  it("moving a node under itself is a cycle", () => expect(wouldCreateCycle(flat, "men", "men")).toBe(true));
  it("moving a node under its own descendant is a cycle", () => expect(wouldCreateCycle(flat, "men", "shoes")).toBe(true));
  it("moving a node under an unrelated node is fine", () => expect(wouldCreateCycle(flat, "men", "realestate")).toBe(false));
  it("moving to top-level (null) is always fine", () => expect(wouldCreateCycle(flat, "shoes", null)).toBe(false));
});

describe("depthOf", () => {
  it("root is depth 1", () => expect(depthOf(flat, "fashion")).toBe(1));
  it("4th level is depth 4", () => expect(depthOf(flat, "sports-shoes")).toBe(4));
});

describe("findPath (restores a cascading dropdown chain from one id)", () => {
  it("finds the root-to-node path in the nested tree", () => {
    const tree = buildTree(flat);
    expect(findPath(tree, "sports-shoes").map((n) => n.id)).toEqual(["fashion", "men", "shoes", "sports-shoes"]);
  });
});
