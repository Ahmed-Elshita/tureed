"use client";

import { useEffect, useRef, useState } from "react";

// Image with a built-in fallback: if the URL is broken/blocked the card
// shows the neutral placeholder icon instead of a broken-image + alt text.
export default function CardImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // Catches images that failed BEFORE React hydrated (onError never fires then).
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/placeholder.svg" alt="" className="h-full w-full object-cover" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-full w-full object-cover" />
  );
}
