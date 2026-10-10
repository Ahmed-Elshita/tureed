"use client";

import { useEffect, useState } from "react";
import { findPath } from "@/lib/tree";
import type { TreeNode } from "@/lib/types";

interface Props {
  tree: TreeNode[];
  value: string | null;
  // "leaf": the seller MUST reach the most specific level (value stays null
  //         until they do) — used when posting a listing.
  // "any":  stopping at any level is fine (a parent means "everything in
  //         it") — used for search and filters.
  mode: "leaf" | "any";
  onChange: (id: string | null, info: { isLeaf: boolean; path: TreeNode[] }) => void;
  isAr: boolean;
  levelLabels: { ar: string[]; en: string[] };
  required?: boolean;
  stacked?: boolean; // force one column (narrow sidebars)
}

const nameOf = (n: TreeNode, isAr: boolean) => (isAr ? n.nameAr : n.nameEn);

// One dropdown per level. The next level only APPEARS once the current
// choice has children: Fashion -> (Men | Women | Kids) -> (Clothing | Shoes ...)
// — exactly the "dependent lists" behaviour: nothing is shown until it's
// relevant, and nothing is ever typed by hand.
export default function CascadingTreeSelect({ tree, value, mode, onChange, isAr, levelLabels, required, stacked }: Props) {
  const idsFor = (id: string | null) => (id ? findPath(tree, id).map((n) => n.id) : []);
  const [chain, setChain] = useState<string[]>(() => idsFor(value));

  // Re-sync when the parent resets/changes the value from outside.
  useEffect(() => {
    const last = chain[chain.length - 1] ?? null;
    const lastNode = last ? findPath(tree, last).at(-1) : undefined;
    const emitted = mode === "leaf" ? (lastNode && !lastNode.children?.length ? last : null) : last;
    if (emitted !== value) setChain(idsFor(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, tree]);

  // Build the visible levels from the chosen chain.
  const levels: TreeNode[][] = [tree];
  let current = tree;
  for (const id of chain) {
    const node = current.find((n) => n.id === id);
    if (!node || !node.children?.length) break;
    levels.push(node.children);
    current = node.children;
  }

  function choose(levelIndex: number, id: string) {
    const next = chain.slice(0, levelIndex).concat(id ? [id] : []);
    setChain(next);
    const last = next[next.length - 1] ?? null;
    const path = last ? findPath(tree, last) : [];
    const isLeaf = path.length > 0 && !path[path.length - 1].children?.length;
    onChange(mode === "leaf" ? (isLeaf ? last : null) : last, { isLeaf, path });
  }

  const labels = isAr ? levelLabels.ar : levelLabels.en;

  return (
    <div className={stacked ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 gap-4 sm:grid-cols-2"}>
      {levels.map((options, i) => (
        <label key={i} className="block text-sm">
          <span className="mb-1 block font-medium text-dark">
            {labels[Math.min(i, labels.length - 1)]} {required && mode === "leaf" && <span className="text-red-500">*</span>}
          </span>
          <select className="field-select" value={chain[i] ?? ""} onChange={(e) => choose(i, e.target.value)}>
            <option value="">
              {mode === "any" && i > 0 ? (isAr ? "الكل" : "All") : isAr ? "اختار..." : "Select..."}
            </option>
            {options.map((n) => (
              <option key={n.id} value={n.id}>
                {nameOf(n, isAr)}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
