import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "25 phút thử thách — still. room",
  description: "Một phiên 25 phút. Một việc. Không lướt. Bắt đầu cùng still. room.",
  alternates: { canonical: "/thu-thach-25-phut" },
  openGraph: {
    title: "25 phút thử thách — still. room",
    description: "Một phiên 25 phút. Một việc. Không lướt.",
    type: "website",
  },
};

export default function TwentyFiveMinuteChallenge() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "32px 20px", background: "#f7f7f5", color: "#171717" }}>
      <section style={{ width: "100%", maxWidth: 720, textAlign: "center" }}>
        <p style={{ letterSpacing: ".14em", textTransform: "uppercase", fontSize: 12, fontWeight: 700, marginBottom: 18 }}>
          still. room / challenge
        </p>
        <h1 style={{ fontSize: "clamp(42px, 9vw, 84px)", lineHeight: .95, letterSpacing: "-.06em", margin: 0 }}>
          25 phút.<br />Không lướt.
        </h1>
        <p style={{ maxWidth: 520, margin: "26px auto 0", fontSize: 18, lineHeight: 1.65, color: "#555" }}>
          Đừng đặt mục tiêu học 5 tiếng. Chọn đúng một việc và hoàn thành một phiên tập trung trước.
        </p>
        <div style={{ display: "grid", gap: 12, maxWidth: 420, margin: "34px auto 0", textAlign: "left" }}>
          {["Chọn đúng 1 việc cần làm", "Bật timer 25 phút", "Để điện thoại sang một bên", "Kết thúc phiên rồi mới quyết định có học tiếp"].map((item, i) => (
            <div key={item} style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 16px", border: "1px solid #ddd", borderRadius: 14, background: "#fff" }}>
              <strong>{i + 1}</strong><span>{item}</span>
            </div>
          ))}
        </div>
        <a href="/" style={{ display: "inline-block", marginTop: 30, padding: "15px 24px", borderRadius: 999, background: "#111", color: "#fff", textDecoration: "none", fontWeight: 700 }}>
          START 25 PHÚT →
        </a>
        <p style={{ marginTop: 18, fontSize: 13, color: "#777" }}>
          Không cần cam kết cả ngày. Chỉ cần bắt đầu.
        </p>
      </section>
    </main>
  );
}
