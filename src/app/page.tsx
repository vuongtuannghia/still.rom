import DashboardClient from "./dashboard-client";

const links = [
  ["/cong-cu/pomodoro", "Pomodoro Timer"],
  ["/cong-cu/focus-timer", "Focus Timer"],
  ["/cong-cu/hoc-cung-nhau", "Học cùng nhau"],
  ["/cong-cu/study-with-me", "Study With Me"],
  ["/cong-cu/study-timer", "Study Timer"],
  ["/cong-cu/lofi-focus", "Lo-fi Focus"],
  ["/cong-cu/body-doubling", "Body Doubling"],
  ["/cong-cu/phong-hoc-online", "Phòng học online"],
  ["/cong-cu/timer-on-thi", "Timer ôn thi"],
  ["/cong-cu/habit-tracker", "Habit Tracker"],
] as const;

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
          lineHeight: 1.9,
        }}
      >
        <strong style={{ color: "#111" }}>still. room guides</strong>
        {links.map(([href, label]) => (
          <span key={href}>
            <span style={{ margin: "0 8px", color: "#aaa" }}>·</span>
            <a href={href} style={{ color: "#333" }}>{label}</a>
          </span>
        ))}
      </section>
    </>
  );
}
