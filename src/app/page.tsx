import DashboardClient from "./dashboard-client";

export default function HomePage() {
  return (
    <>
      <DashboardClient />
      <section
        aria-label="still. room guides"
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "18px 24px 56px",
          color: "#666",
          fontSize: 13,
          lineHeight: 1.7,
        }}
      >
        <strong style={{ color: "#111" }}>still. room guides</strong>
        <span style={{ margin: "0 8px", color: "#aaa" }}>·</span>
        <a href="/cong-cu/pomodoro" style={{ color: "#333" }}>Pomodoro Timer</a>
        <span style={{ margin: "0 8px", color: "#aaa" }}>·</span>
        <a href="/cong-cu/focus-timer" style={{ color: "#333" }}>Focus Timer</a>
        <span style={{ margin: "0 8px", color: "#aaa" }}>·</span>
        <a href="/cong-cu/hoc-cung-nhau" style={{ color: "#333" }}>Học cùng nhau online</a>
        <span style={{ margin: "0 8px", color: "#aaa" }}>·</span>
        <a href="/cong-cu/study-with-me" style={{ color: "#333" }}>Study With Me</a>
      </section>
    </>
  );
}
