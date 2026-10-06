import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background: "#0f0f0f",
          color: "#fff",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700, marginBottom: 28 }}>
          still. room
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.08, maxWidth: 980 }}>
          Tập trung hơn.<br />Học cùng nhau.
        </div>
        <div style={{ display: "flex", fontSize: 28, marginTop: 30, color: "#cfcfcf", maxWidth: 900 }}>
          Pomodoro · Focus Timer · Phòng học chung · Theo dõi tiến độ
        </div>
        <div style={{ display: "flex", fontSize: 24, marginTop: 52, color: "#999" }}>
          still-room-original.onrender.com
        </div>
      </div>
    ),
    { ...size }
  );
}
