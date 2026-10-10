"use client";

import { useRef } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { categoryAccent } from "@/lib/categoryStyle";

interface TopCategory {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
}

export default function CategoryStrip({ categories }: { categories: TopCategory[] }) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const ref = useRef<HTMLDivElement>(null);

  function scroll(dir: 1 | -1) {
    ref.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  }

  if (categories.length === 0) return null;

  return (
    <div className="relative border-b border-gray-light bg-white">
      <button
        aria-label="scroll left"
        onClick={() => scroll(-1)}
        className="absolute inset-y-0 start-0 z-10 hidden w-9 items-center justify-center bg-gradient-to-r from-white via-white/90 to-transparent md:flex"
      >
        ‹
      </button>
      <div ref={ref} className="rail mx-auto max-w-7xl px-5 py-3">
        {categories.map((c) => {
          const accent = categoryAccent(c.slug);
          return (
            <Link
              key={c.id}
              href={`/${locale}/category/${c.slug}`}
              className="flex shrink-0 items-center gap-2 rounded-full border border-gray-light py-2 pe-4 ps-2 text-xs font-bold"
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-sm"
                style={{ background: accent.tint, color: accent.color }}
              >
                {(isAr ? c.nameAr : c.nameEn).charAt(0)}
              </span>
              {isAr ? c.nameAr : c.nameEn}
            </Link>
          );
        })}
      </div>
      <button
        aria-label="scroll right"
        onClick={() => scroll(1)}
        className="absolute inset-y-0 end-0 z-10 hidden w-9 items-center justify-center bg-gradient-to-l from-white via-white/90 to-transparent md:flex"
      >
        ›
      </button>
    </div>
  );
}
