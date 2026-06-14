// Default share image for every route (Next auto-wires this as og:image, and
// Twitter falls back to it via summary_large_image). On-brand Sunday Bazaar:
// khadi cream surface, bazaar-rose wordmark, banana-leaf + marigold accents.
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Crafty: India's craft community, one city at a time";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#FFF6E5",
          backgroundImage:
            "radial-gradient(circle at 88% 16%, rgba(230,168,23,0.18) 0, rgba(230,168,23,0) 38%), radial-gradient(circle at 8% 92%, rgba(31,95,60,0.12) 0, rgba(31,95,60,0) 42%)",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#1F5F3C",
          }}
        >
          <span style={{ fontSize: 34 }}>❋</span> The Sunday Bazaar
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 116,
            fontWeight: 800,
            lineHeight: 1,
            color: "#B5365B",
            letterSpacing: "-0.02em",
          }}
        >
          Crafty
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 40,
            lineHeight: 1.25,
            color: "#6B5A3E",
            maxWidth: 880,
          }}
        >
          India's craft community, one city at a time. Crafters, supply stores,
          studios and events, found near you.
        </div>
        <div
          style={{
            marginTop: 44,
            display: "flex",
            gap: "12px",
          }}
        >
          {["#B5365B", "#1F5F3C", "#E6A817", "#3D4A8C"].map((c) => (
            <div
              key={c}
              style={{ width: 56, height: 14, borderRadius: 999, background: c }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
