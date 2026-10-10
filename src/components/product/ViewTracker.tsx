"use client";

import { useEffect } from "react";

export default function ViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    fetch(`/api/products/${productId}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "view" }),
      keepalive: true,
    }).catch(() => {}); // tracking is best-effort — never block the page on it
  }, [productId]);

  return null;
}
