import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Guide = {
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  keywords: string[];
  sections?: { title: string; body: string }[];
  steps: string[];
  faq: { q: string; a: string }[];
};

const GUIDES: Record<string, Guide> = {
  pomodoro: {
    title: "Pomodoro Timer online: học tập trung theo phiên",
    description:
      "Dùng Pomodoro Timer online để chia thời gian học thành các phiên tập trung ngắn, nghỉ hợp lý và theo dõi tiến độ ngay trên still. room.",
    eyebrow: "POMODORO TIMER",
    intro:
      "Pomodoro là cách đơn giản để bắt đầu một phiên học mà không phải nghĩ quá nhiều. still. room kết hợp focus timer, nhiệm vụ và thống kê trong cùng một không gian.",
    keywords: ["pomodoro timer", "đồng hồ pomodoro", "pomodoro online", "timer học tập"],
    steps: [
      "Chọn một việc cụ thể cần hoàn thành.",
      "Bắt đầu một phiên Focus Timer và chỉ làm một việc trong phiên đó.",
      "Khi hết phiên, nghỉ ngắn rồi ghi lại kết quả.",
      "Lặp lại các phiên để tạo nhịp học ổn định.",
    ],
    faq: [
      {
        q: "Pomodoro phù hợp với việc học nào?",
        a: "Phù hợp với đọc tài liệu, làm bài tập, ôn thi, viết bài và các nhiệm vụ cần tập trung liên tục.",
      },
      {
        q: "Có thể kết hợp Pomodoro với danh sách việc cần làm không?",
        a: "Có. still. room đặt Focus Timer cạnh khu vực nhiệm vụ và thống kê để bạn theo dõi cả việc đã làm lẫn thời gian đã tập trung.",
      },
    ],
  },
  "focus-timer": {
    title: "Focus Timer online: tập trung học và làm việc",
    description:
      "Focus Timer online tối giản cho học sinh, sinh viên và người làm việc cần một bộ đếm thời gian rõ ràng, ít xao nhãng và có thống kê.",
    eyebrow: "FOCUS TIMER",
    intro:
      "Khi mục tiêu chỉ là ngồi xuống và bắt đầu, một bộ đếm thời gian đơn giản thường hiệu quả hơn một giao diện quá nhiều thứ.",
    keywords: ["focus timer", "đồng hồ tập trung", "timer học", "study timer"],
    steps: [
      "Viết đúng một mục tiêu cho phiên tập trung.",
      "Bắt đầu timer và giữ giao diện ở chế độ tối giản.",
      "Không chuyển sang nhiệm vụ khác trong cùng một phiên.",
      "Kiểm tra thống kê sau phiên để điều chỉnh mục tiêu ngày tiếp theo.",
    ],
    faq: [
      {
        q: "Focus Timer khác Pomodoro thế nào?",
        a: "Focus Timer là khái niệm rộng hơn; Pomodoro là một phương pháp cụ thể chia thời gian thành phiên làm việc và thời gian nghỉ.",
      },
      {
        q: "Có nên đặt mục tiêu theo số phút không?",
        a: "Có. Mục tiêu theo phút giúp bạn đo được lượng thời gian tập trung thay vì chỉ dựa vào cảm giác.",
      },
    ],
  },
  "hoc-cung-nhau": {
    title: "Học cùng nhau online: tìm phòng học và học chung",
    description:
      "Học cùng nhau online trong phòng học của still. room: bật camera, giữ nhịp học, kết nối với người khác và tập trung trong một không gian chung.",
    eyebrow: "HỌC CÙNG NHAU",
    intro:
      "Học chung có thể giúp bạn bớt cảm giác học một mình. still. room dành riêng một khu vực cho study room và kết nối cộng đồng học tập.",
    keywords: ["học cùng nhau online", "học chung online", "phòng học online", "study room"],
    steps: [
      "Mở khu vực Học chung và chọn phòng phù hợp.",
      "Chuẩn bị tài liệu, mục tiêu và thời lượng học trước khi bắt đầu.",
      "Giữ camera hoặc trạng thái học theo cách phù hợp với phòng.",
      "Sau phiên học, xem lại lịch sử và tiến độ của bạn.",
    ],
    faq: [
      {
        q: "Học cùng nhau online có phù hợp khi ôn thi không?",
        a: "Có. Bạn có thể dùng phòng học chung để tạo khung thời gian học cố định và giảm việc trì hoãn.",
      },
      {
        q: "Có thể vừa học chung vừa dùng timer không?",
        a: "Có. Hệ thống được thiết kế để kết hợp không gian học chung với bộ đếm tập trung và theo dõi tiến độ.",
      },
    ],
  },
  "study-with-me": {
    title: "Study With Me online: một góc học yên để bắt đầu",
    description:
      "Study With Me online cho những lúc bạn cần một không gian học yên, focus timer, ambient sound và phòng học chung trong một trang.",
    eyebrow: "STUDY WITH ME",
    intro:
      "Không phải lúc nào bạn cũng cần thêm động lực. Đôi khi chỉ cần một không gian đủ yên để ngồi xuống, bật timer và bắt đầu.",
    keywords: ["study with me", "study with me online", "study room online", "học cùng nhau"],
    steps: [
      "Chọn một không gian hoặc cảnh nền phù hợp.",
      "Bật Focus Timer và đặt mục tiêu rõ ràng.",
      "Mở ambient sound hoặc YouTube khi cần một nền âm thanh ổn định.",
      "Kết thúc phiên bằng việc xem lại thời gian tập trung.",
    ],
    faq: [
      {
        q: "Study With Me là gì?",
        a: "Đó là hình thức tạo cảm giác đang học cùng người khác, thường thông qua video, livestream hoặc phòng học trực tuyến.",
      },
      {
        q: "Still. room có những công cụ nào cho Study With Me?",
        a: "Trang có focus timer, ambient sound, YouTube study room, nhiệm vụ và thống kê tiến độ.",
      },
    ],
  },
  "aesthetic-study-timer": {
    title: "Aesthetic Study Timer online",
    description: "Aesthetic Study Timer tối giản cho những buổi học cần một không gian đẹp, ít xao nhãng và có timer tập trung.",
    eyebrow: "AESTHETIC STUDY",
    intro: "Giao diện đẹp chỉ có ích khi nó làm bạn muốn quay lại bàn học. Aesthetic Study Timer của still. room tập trung vào bối cảnh yên, timer và các công cụ hỗ trợ học tập.",
    keywords: ["aesthetic study timer", "aesthetic timer", "study timer", "aesthetic study"],
    sections: [
      { title: "Một timer đẹp cần làm được gì?", body: "Timer nên giúp bạn bắt đầu nhanh, nhìn thời gian rõ và không cạnh tranh sự chú ý với tài liệu. Phần thẩm mỹ chỉ nên tạo bối cảnh, không biến thành một nguồn xao nhãng mới." },
      { title: "Tạo một góc học có thể lặp lại", body: "Chọn cùng một cảnh nền, âm thanh và cách bắt đầu cho những buổi học tương tự. Một setup nhất quán giúp giảm số quyết định trước khi bạn ngồi xuống." },
      { title: "Kết hợp timer với nhiệm vụ", body: "Đừng chỉ đặt mục tiêu 60 phút. Hãy ghi rõ bạn sẽ hoàn thành gì trong phiên để cuối buổi có một kết quả kiểm tra được." },
    ],
    steps: ["Chọn bối cảnh học.", "Viết mục tiêu của phiên.", "Bật timer và tập trung.", "Ghi lại kết quả."],
    faq: [
      { q: "Aesthetic Study Timer có khác Study Timer thường không?", a: "Chức năng cốt lõi vẫn là quản lý thời gian. Điểm khác nằm ở bối cảnh giao diện và các yếu tố ambient giúp tạo một không gian học ổn định." },
      { q: "Nên ưu tiên đẹp hay ít xao nhãng?", a: "Ưu tiên ít xao nhãng. Giao diện đẹp chỉ nên hỗ trợ việc bắt đầu và duy trì phiên học." },
    ],
  },
  "forest-alternative": {
    title: "Forest alternative miễn phí cho học tập",
    description: "Tìm một Forest alternative miễn phí thiên về study room, focus timer, thói quen và thống kê thay vì chỉ trồng cây.",
    eyebrow: "FOREST ALTERNATIVE",
    intro: "Nếu bạn thích ý tưởng tập trung bằng một nghi thức trực quan nhưng muốn kết hợp thêm phòng học chung, nhiệm vụ và thống kê, still. room đi theo hướng khác.",
    keywords: ["forest alternative", "forest app alternative", "focus timer alternative", "study app alternative"],
    sections: [
      { title: "Điểm khác của still. room", body: "still. room không cố tái tạo mọi cơ chế của Forest. Thay vào đó, nó gom focus timer, nhiệm vụ, habits, thống kê, ambient sound và study room vào một không gian dành cho việc học." },
      { title: "Khi nào nên chọn một công cụ khác?", body: "Nếu bạn chỉ cần một timer cực đơn giản, một ứng dụng chuyên biệt có thể đã đủ. still. room phù hợp hơn khi bạn muốn timer trở thành trung tâm của một hệ thống học tập có cộng đồng." },
      { title: "Dùng thử theo một phiên", body: "Đừng quyết định dựa trên danh sách tính năng. Hãy mở một phiên tập trung, hoàn thành một nhiệm vụ và xem bạn có muốn quay lại công cụ này vào ngày mai hay không." },
    ],
    steps: ["Mở still. room.", "Chọn một mục tiêu học.", "Chạy một phiên tập trung.", "Đánh giá trải nghiệm và tiến độ."],
    faq: [
      { q: "still. room có phải bản sao của Forest không?", a: "Không. Đây là một không gian tập trung khác, với trọng tâm vào học tập, study room, nhiệm vụ, habits và thống kê." },
      { q: "Forest alternative có miễn phí không?", a: "still. room hiện có thể sử dụng các tính năng web cốt lõi mà không cần mua ứng dụng. Chính sách và tính năng có thể thay đổi theo thời gian." },
    ],
  }
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(GUIDES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDES[slug];
  if (!guide) return {};
  const url = `/cong-cu/${slug}`;
  return {
    title: guide.title,
    description: guide.description,
    keywords: guide.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      siteName: "still. room",
      title: guide.title,
      description: guide.description,
      locale: "vi_VN",
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = GUIDES[slug];
  if (!guide) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f4f4f0", color: "#111" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "56px 22px 80px" }}>
        <nav style={{ fontSize: 13, marginBottom: 46 }}>
          <Link href="/" style={{ color: "#666", textDecoration: "none" }}>still. room</Link>
          <span style={{ margin: "0 8px", color: "#aaa" }}>/</span>
          <span>{guide.eyebrow}</span>
        </nav>

        <header style={{ maxWidth: 800 }}>
          <div style={{ fontSize: 12, letterSpacing: ".16em", fontWeight: 800, color: "#777" }}>{guide.eyebrow}</div>
          <h1 style={{ fontSize: "clamp(40px, 7vw, 76px)", lineHeight: .95, letterSpacing: "-.055em", margin: "18px 0" }}>
            {guide.title}
          </h1>
          <p style={{ fontSize: 20, lineHeight: 1.6, color: "#666", margin: 0 }}>{guide.intro}</p>
        </header>

        {guide.sections && guide.sections.length > 0 && (
          <section style={{ marginTop: 26, display: "grid", gap: 16 }}>
            {guide.sections.map((section) => (
              <article key={section.title} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 22, padding: 26 }}>
                <h2 style={{ margin: "0 0 10px", fontSize: 24 }}>{section.title}</h2>
                <p style={{ margin: 0, lineHeight: 1.78, color: "#555" }}>{section.body}</p>
              </article>
            ))}
          </section>
        )}

        <section style={{ marginTop: 42, display: "grid", gap: 18 }}>
          <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 24, padding: 28 }}>
            <h2 style={{ marginTop: 0 }}>Bắt đầu trong 4 bước</h2>
            <ol style={{ margin: 0, paddingLeft: 22, lineHeight: 1.9 }}>
              {guide.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </div>

          <div style={{ background: "#111", color: "#fff", borderRadius: 24, padding: 28 }}>
            <div style={{ fontSize: 12, letterSpacing: ".14em", color: "#999" }}>STILL. ROOM</div>
            <h2 style={{ margin: "10px 0" }}>Vào không gian tập trung</h2>
            <p style={{ color: "#bbb", lineHeight: 1.7 }}>Dùng timer, nhiệm vụ, thói quen, thống kê và phòng học chung ở cùng một nơi.</p>
            <Link href="/" style={{ display: "inline-block", marginTop: 8, padding: "12px 18px", borderRadius: 999, background: "#fff", color: "#111", textDecoration: "none", fontWeight: 700 }}>
              Mở still. room →
            </Link>
          </div>

          <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 24, padding: 28 }}>
            <h2 style={{ marginTop: 0 }}>Câu hỏi thường gặp</h2>
            <div style={{ display: "grid", gap: 20 }}>
              {guide.faq.map((item) => (
                <div key={item.q}>
                  <h3 style={{ margin: "0 0 7px" }}>{item.q}</h3>
                  <p style={{ margin: 0, color: "#666", lineHeight: 1.7 }}>{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer style={{ marginTop: 44, paddingTop: 24, borderTop: "1px solid #ddd", fontSize: 13, color: "#777" }}>
          Khám phá thêm:{" "}
          <Link href="/cong-cu/pomodoro" style={{ color: "#111" }}>Pomodoro</Link>{" · "}
          <Link href="/cong-cu/focus-timer" style={{ color: "#111" }}>Focus Timer</Link>{" · "}
          <Link href="/cong-cu/hoc-cung-nhau" style={{ color: "#111" }}>Học cùng nhau</Link>{" · "}
          <Link href="/cong-cu/study-with-me" style={{ color: "#111" }}>Study With Me</Link>
        </footer>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
