"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import type { MapPin } from "@/components/map/ListingsMap";

const ListingsMap = dynamic(() => import("@/components/map/ListingsMap"), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full animate-pulse rounded-2xl bg-gray-light" />,
});

export default function CategoryMapToggle({
  pins,
  centerLat,
  centerLng,
}: {
  pins: MapPin[];
  centerLat: number;
  centerLng: number;
}) {
  const [view, setView] = useState<"list" | "map">("list");
  const locale = useLocale();
  const isAr = locale === "ar";

  return (
    <div>
      <div className="mb-4 inline-flex rounded-xl border border-gray-light bg-white p-1 text-xs font-bold">
        <button
          onClick={() => setView("list")}
          className={`rounded-lg px-3 py-1.5 ${view === "list" ? "bg-dark text-white" : "text-mute"}`}
        >
          {isAr ? "قائمة" : "List"}
        </button>
        <button
          onClick={() => setView("map")}
          className={`rounded-lg px-3 py-1.5 ${view === "map" ? "bg-dark text-white" : "text-mute"}`}
        >
          🗺️ {isAr ? "خريطة" : "Map"}
        </button>
      </div>
      {view === "map" && <ListingsMap pins={pins} centerLat={centerLat} centerLng={centerLng} />}
    </div>
  );
}
