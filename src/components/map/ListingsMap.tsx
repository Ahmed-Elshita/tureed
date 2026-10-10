"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLocale } from "next-intl";

// Leaflet's default marker icons reference image paths that break under
// Next.js's bundler unless re-pointed — this is the standard fix, done
// once here rather than in every page that renders a map.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Leaflet's own typings don't expose this internal method; this is the documented workaround.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface MapPin {
  id: string;
  slug: string;
  title: string;
  price: number | null;
  lat: number;
  lng: number;
}

interface Props {
  pins: MapPin[];
  centerLat: number;
  centerLng: number;
}

// IMPORTANT: Leaflet touches `window` at import time, so any page using
// this component must load it with next/dynamic and { ssr: false }:
//   const ListingsMap = dynamic(() => import("@/components/map/ListingsMap"), { ssr: false });
export default function ListingsMap({ pins, centerLat, centerLng }: Props) {
  const locale = useLocale();

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-gray-light">
      <MapContainer center={[centerLat, centerLng]} zoom={12} style={{ height: "100%", width: "100%" }}>
        {/* OpenStreetMap tiles are free and require no API key or billing
            account — a deliberate choice over Google Maps, which bills
            per map load and would add real cost at scale. */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]}>
            <Popup>
              <a href={`/${locale}/product/${p.slug}`} className="font-bold">
                {p.title}
              </a>
              {p.price && <div>{p.price.toLocaleString()} EGP</div>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
