// Categories and locations are both self-referencing trees of ANY depth
// (Fashion > Men > Shoes, Egypt > Cairo > Nasr City > ...). Everything
// here is pure — no database — so it's cheap to test and reuse.

export interface FlatNode {
  id: string;
  parentId: string | null;
  sortOrder?: number;
}

export type TreeOf<T extends FlatNode> = T & { children: TreeOf<T>[] };

function childrenMap<T extends FlatNode>(flat: T[]) {
  const map = new Map<string | null, T[]>();
  for (const n of flat) {
    const list = map.get(n.parentId) ?? [];
    list.push(n);
    map.set(n.parentId, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  return map;
}

// Builds the nested tree. A node whose parent is NOT in `flat` is left out
// on purpose: callers pass only ACTIVE nodes for public pages, so hiding a
// parent automatically hides its whole subtree (instead of orphaned
// children suddenly appearing as top-level categories).
export function buildTree<T extends FlatNode>(flat: T[]): TreeOf<T>[] {
  const byParent = childrenMap(flat);
  const seen = new Set<string>(); // guards against cycles in bad data
  const build = (parentId: string | null): TreeOf<T>[] =>
    (byParent.get(parentId) ?? [])
      .filter((n) => !seen.has(n.id) && (seen.add(n.id), true))
      .map((n) => ({ ...n, children: build(n.id) }));
  return build(null);
}

// All ids below `id` (any depth). `includeSelf` is what "show me everything
// in Fashion" needs: products can sit in Fashion itself or any descendant.
export function descendantIds<T extends FlatNode>(flat: T[], id: string, includeSelf = true): string[] {
  const byParent = childrenMap(flat);
  const result: string[] = includeSelf ? [id] : [];
  const visited = new Set<string>([id]);
  const queue = [id];
  while (queue.length) {
    const current = queue.shift()!;
    for (const child of byParent.get(current) ?? []) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      result.push(child.id);
      queue.push(child.id);
    }
  }
  return result;
}

// Root → node. Empty array when `id` isn't in `flat`. If a link in the chain
// is missing (e.g. an inactive ancestor was filtered out) the chain stops
// early and its first element will have a non-null parentId — callers use
// that to detect "not reachable".
export function ancestorChain<T extends FlatNode>(flat: T[], id: string): T[] {
  const byId = new Map(flat.map((n) => [n.id, n]));
  const chain: T[] = [];
  const visited = new Set<string>();
  let current = byId.get(id);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

export function isReachable<T extends FlatNode>(flat: T[], id: string): boolean {
  const chain = ancestorChain(flat, id);
  return chain.length > 0 && chain[0].parentId === null;
}

export function hasChildren<T extends FlatNode>(flat: T[], id: string): boolean {
  return flat.some((n) => n.parentId === id);
}

// Moving a node under itself or under one of its own descendants would
// detach the whole subtree from the root (an unreachable loop).
export function wouldCreateCycle<T extends FlatNode>(flat: T[], nodeId: string, newParentId: string | null): boolean {
  if (newParentId === null) return false;
  if (newParentId === nodeId) return true;
  return ancestorChain(flat, newParentId).some((n) => n.id === nodeId);
}

export function depthOf<T extends FlatNode>(flat: T[], id: string): number {
  return ancestorChain(flat, id).length; // root = 1
}

// For the nested (already built) tree: root → node path, used by the
// cascading dropdowns to restore the chosen chain from a single id.
export function findPath<N extends { id: string; children?: N[] }>(tree: N[], id: string): N[] {
  for (const node of tree) {
    if (node.id === id) return [node];
    const sub = node.children ? findPath(node.children, id) : [];
    if (sub.length) return [node, ...sub];
  }
  return [];
}

export const MAX_TREE_DEPTH = 6;
