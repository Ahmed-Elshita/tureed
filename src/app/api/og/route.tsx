import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Generates the 1200x630 preview image WhatsApp/Facebook/Twitter show
// when a listing link is shared — built entirely server-side from the
// listing's own data (title/price/location), no design tool or paid
// image API involved. Call it as /api/og?title=...&price=...&loc=...
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title") ?? "Tureed";
  const price = searchParams.get("price");
  const loc = searchParams.get("loc") ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #0B1220 0%, #1e3a8a 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "linear-gradient(135deg,#3B82F6,#6366F1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            T
          </div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>tureed</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.2 }}>{title}</div>
          {price && <div style={{ fontSize: 36, color: "#93c5fd", fontWeight: 700 }}>{price} EGP</div>}
          {loc && <div style={{ fontSize: 22, color: "#94a3b8" }}>📍 {loc}</div>}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
