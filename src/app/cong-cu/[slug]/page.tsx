import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Guide = {
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  keywords: string[];
  sections: { title: string; body: string }[];
  steps: string[];
  faq: { q: string; a: string }[];
};

const GUIDES: Record<string, Guide> = {
  pomodoro: {
    title: "Pomodoro Timer online cho học tập",
    description: "Pomodoro Timer online miễn phí để chia phiên học, nghỉ hợp lý và theo dõi thời gian tập trung trên still. room.",
    eyebrow: "POMODORO TIMER",
    intro: "Một phiên học tốt bắt đầu từ một mục tiêu nhỏ và một khoảng thời gian rõ ràng. still. room gom timer, nhiệm vụ và thống kê vào cùng một không gian để bạn bắt đầu nhanh hơn.",
    keywords: ["pomodoro timer", "pomodoro online", "đồng hồ pomodoro", "timer học tập"],
    sections: [
      { title: "Pomodoro hoạt động như thế nào?", body: "Phương pháp Pomodoro chia công việc thành các khoảng tập trung xen kẽ nghỉ ngắn. Điểm quan trọng không phải con số 25 phút cố định, mà là tạo ra một nhịp làm việc có điểm bắt đầu và điểm kết thúc rõ ràng." },
      { title: "Dùng Pomodoro khi ôn thi", body: "Hãy gắn mỗi phiên với một nhiệm vụ cụ thể: làm 20 câu hóa, đọc một chương sinh hoặc chữa một đề. Sau phiên, ghi lại kết quả để biết thời gian thực tế cần cho từng loại nhiệm vụ." },
      { title: "Khi nào nên đổi độ dài phiên?", body: "Nhiệm vụ cần đọc sâu có thể hợp với phiên dài hơn; bài tập ngắn có thể dùng phiên ngắn hơn. Điều quan trọng là chọn thời lượng bạn có thể duy trì liên tục và đánh giá lại sau vài ngày." },
    ],
    steps: ["Chọn một mục tiêu duy nhất cho phiên.", "Bắt đầu timer và bỏ các việc không liên quan.", "Nghỉ ngắn sau khi kết thúc phiên.", "Ghi lại kết quả rồi bắt đầu phiên tiếp theo."],
    faq: [
      { q: "Pomodoro có bắt buộc là 25/5 không?", a: "Không. 25/5 là một cấu hình phổ biến; bạn có thể chọn thời lượng khác phù hợp với nhiệm vụ và sức tập trung." },
      { q: "Pomodoro có hợp để ôn thi không?", a: "Có. Việc chia buổi học thành các phiên giúp bạn đặt mục tiêu nhỏ, giảm trì hoãn và đo được thời gian đã thực sự học." },
    ],
  },
  "focus-timer": {
    title: "Focus Timer online miễn phí",
    description: "Focus Timer online tối giản cho học và làm việc: đặt mục tiêu, bắt đầu phiên tập trung và theo dõi tiến độ.",
    eyebrow: "FOCUS TIMER",
    intro: "Focus Timer hữu ích khi bạn muốn bỏ bớt quyết định và chỉ tập trung vào việc đang làm. still. room đặt timer ở trung tâm của một không gian ít xao nhãng.",
    keywords: ["focus timer", "study timer", "đồng hồ tập trung", "timer học"],
    sections: [
      { title: "Một phiên tập trung nên bắt đầu thế nào?", body: "Viết một câu mô tả đầu ra của phiên trước khi bấm Start. Ví dụ: hoàn thành 10 bài tập, tóm tắt hai trang hoặc viết phần mở đầu của bài luận." },
      { title: "Đo thời gian thay vì cảm giác", body: "Thời gian bạn ngồi trước bàn không đồng nghĩa với thời gian tập trung. Ghi lại các phiên hoàn thành giúp bạn phát hiện ngày nào, môn nào hoặc khung giờ nào có hiệu suất tốt hơn." },
      { title: "Giảm xao nhãng", body: "Tắt thông báo, để điện thoại ngoài tầm tay và dùng một tab làm việc chính. Timer không thay thế kỷ luật; nó tạo ra một ranh giới thời gian rõ ràng để bạn giữ nhịp." },
    ],
    steps: ["Xác định đầu ra của phiên.", "Chọn thời lượng phù hợp.", "Bắt đầu timer và chỉ làm một việc.", "Xem lịch sử sau phiên."],
    faq: [
      { q: "Focus Timer khác đồng hồ đếm ngược thường thế nào?", a: "Focus Timer được dùng như một nghi thức bắt đầu và kết thúc phiên tập trung, thường đi kèm mục tiêu, lịch sử hoặc thống kê." },
      { q: "Nên tập trung bao lâu?", a: "Không có một thời lượng tối ưu cho mọi người. Hãy bắt đầu bằng khoảng thời gian bạn có thể duy trì ổn định và điều chỉnh theo dữ liệu thực tế." },
    ],
  },
  "hoc-cung-nhau": {
    title: "Học cùng nhau online miễn phí",
    description: "Học cùng nhau online trong phòng học của still. room: tạo nhịp học, kết nối với người khác và theo dõi thời gian tập trung.",
    eyebrow: "HỌC CÙNG NHAU",
    intro: "Học chung hiệu quả nhất khi mọi người cùng có một mục tiêu và một khung thời gian. still. room kết hợp study room với timer, nhiệm vụ và thống kê.",
    keywords: ["học cùng nhau online", "học chung online", "phòng học online", "study room"],
    sections: [
      { title: "Học cùng nhau có ích ở điểm nào?", body: "Một phòng học chung tạo ra cảm giác cùng đang làm việc với người khác. Đây là một dạng body doubling: sự hiện diện của người khác giúp giảm cảm giác phải tự bắt đầu một mình." },
      { title: "Chuẩn bị trước khi vào phòng", body: "Xác định môn học, đầu ra và thời lượng trước khi vào phòng. Khi đã bắt đầu, tránh biến phòng học thành nơi lướt nội dung hoặc trò chuyện không liên quan." },
      { title: "Kết hợp với timer", body: "Bạn có thể chia buổi học thành các phiên tập trung và nghỉ. Sau buổi học, lịch sử phiên giúp bạn biết mình thực sự đã học bao lâu." },
    ],
    steps: ["Chọn phòng học phù hợp.", "Đặt mục tiêu cho phiên.", "Bắt đầu học cùng mọi người.", "Kết thúc phiên và xem lại tiến độ."],
    faq: [
      { q: "Học cùng nhau online có phải livestream không?", a: "Không. Study room có thể là phòng học trực tiếp, phòng video hoặc không gian cộng tác nơi mỗi người học theo mục tiêu riêng." },
      { q: "Có nên bật camera khi học chung?", a: "Tùy phòng và mục tiêu. Camera có thể tăng cảm giác hiện diện nhưng không bắt buộc nếu bạn tập trung tốt hơn mà không dùng camera." },
    ],
  },
  "study-with-me": {
    title: "Study With Me online để giữ nhịp học",
    description: "Study With Me online với focus timer, ambient sound và phòng học chung để tạo một không gian học yên.",
    eyebrow: "STUDY WITH ME",
    intro: "Study With Me thành công vì nó biến việc bắt đầu thành một hoạt động có bối cảnh. Bạn không cần chờ có động lực; hãy tạo một nghi thức bắt đầu và giữ nó đều đặn.",
    keywords: ["study with me", "study with me online", "study room online", "học cùng nhau"],
    sections: [
      { title: "Tạo một không gian học dễ quay lại", body: "Giữ cùng một bố cục, âm thanh nền và cách bắt đầu giúp não nhận ra tín hiệu của một phiên học. still. room cung cấp các công cụ để tạo bối cảnh đó ngay trên web." },
      { title: "Đừng biến Study With Me thành giải trí", body: "Mục tiêu của không gian này là giảm xao nhãng. Nếu video hoặc âm thanh khiến bạn liên tục chuyển tab, hãy dùng nền âm thanh đơn giản hơn hoặc tắt hoàn toàn." },
      { title: "Kết thúc có chủ đích", body: "Khi timer kết thúc, ghi lại việc đã hoàn thành. Một kết thúc rõ ràng giúp buổi sau bắt đầu nhanh hơn vì bạn biết mình đang ở đâu." },
    ],
    steps: ["Chọn bối cảnh học.", "Đặt timer.", "Bắt đầu nhiệm vụ đã chọn.", "Ghi lại tiến độ sau phiên."],
    faq: [
      { q: "Study With Me có thực sự giúp tập trung không?", a: "Nó có thể tạo thêm cấu trúc và cảm giác có người cùng học, nhưng hiệu quả phụ thuộc vào cách bạn sử dụng và mức độ xao nhãng của môi trường." },
      { q: "Có cần xem video Study With Me không?", a: "Không. Bạn có thể chỉ dùng một phòng học chung, timer hoặc âm thanh nền nếu đó là cấu hình ít gây phân tâm hơn." },
    ],
  },
  "study-timer": {
    title: "Study Timer online miễn phí",
    description: "Study Timer online cho sinh viên và học sinh: chia buổi học thành phiên, theo dõi thời gian và giữ nhịp ôn tập.",
    eyebrow: "STUDY TIMER",
    intro: "Study Timer không phải để khiến bạn học lâu hơn bằng mọi giá. Nó giúp bạn nhìn thấy thời gian học thật và biến một buổi dài thành các bước dễ bắt đầu.",
    keywords: ["study timer", "study timer online", "timer học bài", "đồng hồ học tập"],
    sections: [
      { title: "Dùng Study Timer cho nhiều môn", body: "Mỗi phiên nên có một môn hoặc một loại nhiệm vụ. Khi thay môn, bắt đầu phiên mới để lịch sử của bạn phản ánh thời gian thực tế cho từng công việc." },
      { title: "Ôn thi theo tuần", body: "Cuối mỗi ngày, nhìn lại số phiên và tổng thời gian. Cuối tuần, dùng dữ liệu đó để điều chỉnh phân bổ giữa các môn thay vì chỉ ước lượng bằng cảm giác." },
      { title: "Bắt đầu từ phiên ngắn", body: "Ngày học không tốt vẫn có thể bắt đầu bằng một phiên ngắn. Mục tiêu là vượt qua ma sát khởi động, sau đó mới quyết định có làm thêm phiên nữa hay không." },
    ],
    steps: ["Viết nhiệm vụ học.", "Chọn thời lượng.", "Học đến khi timer kết thúc.", "Ghi lại phần đã hoàn thành."],
    faq: [
      { q: "Study Timer có phù hợp với sinh viên không?", a: "Có. Bạn có thể dùng nó cho bài tập, đọc giáo trình, học ngoại ngữ hoặc ôn thi." },
      { q: "Nên dùng Study Timer bao nhiêu phút?", a: "Hãy chọn thời lượng bạn có thể duy trì tốt. Bạn có thể thử 25, 45 hoặc 50 phút rồi điều chỉnh theo loại nhiệm vụ." },
    ],
  },
  "lofi-focus": {
    title: "Lo-fi Focus Timer: học cùng âm thanh",
    description: "Lo-fi Focus Timer kết hợp bộ đếm tập trung với âm thanh nền để tạo không gian học ổn định trên still. room.",
    eyebrow: "LO-FI FOCUS",
    intro: "Âm thanh nền có thể giúp che tiếng ồn bất chợt và tạo tín hiệu bắt đầu buổi học. Hãy xem nó như một phần của môi trường, không phải mục tiêu chính.",
    keywords: ["lofi focus timer", "lofi study timer", "study sounds", "ambient focus"],
    sections: [
      { title: "Khi nào nên dùng âm thanh nền?", body: "Âm thanh đều và quen thuộc có thể phù hợp với các buổi học cần duy trì nhịp ổn định. Nếu âm thanh kéo sự chú ý khỏi tài liệu, hãy tắt nó." },
      { title: "Kết hợp timer và YouTube", body: "Nếu bạn dùng video hoặc study-with-me trên YouTube, hãy đặt timer làm bộ điều khiển thời gian chính để giờ nghỉ không phụ thuộc vào điểm kết thúc của video." },
      { title: "Giữ setup nhất quán", body: "Dùng cùng một kiểu âm thanh trong những phiên cùng loại giúp bạn giảm số quyết định trước khi học và bắt đầu nhanh hơn." },
    ],
    steps: ["Chọn âm thanh nền.", "Đặt timer.", "Giữ một nhiệm vụ duy nhất.", "Tắt âm thanh nếu nó gây xao nhãng."],
    faq: [
      { q: "Lo-fi có bắt buộc khi học không?", a: "Không. Một số người tập trung tốt hơn trong im lặng; hãy ưu tiên cấu hình giúp bạn ít chuyển sự chú ý nhất." },
      { q: "Có thể dùng YouTube khi bật timer không?", a: "Có. Bạn có thể sử dụng video như âm thanh hoặc study-with-me, trong khi timer quản lý thời lượng phiên." },
    ],
  },
  "body-doubling": {
    title: "Body Doubling online cho học và làm việc",
    description: "Body doubling online là cách tạo cảm giác đang làm việc cùng người khác. still. room kết hợp body doubling với phòng học và focus timer.",
    eyebrow: "BODY DOUBLING",
    intro: "Body doubling không đòi hỏi hai người làm cùng một việc. Cốt lõi là sự hiện diện giúp bạn bắt đầu và duy trì hành vi đã chọn.",
    keywords: ["body doubling", "body doubling online", "virtual coworking", "study together"],
    sections: [
      { title: "Body doubling là gì?", body: "Đó là một cách làm việc trong đó bạn thực hiện nhiệm vụ của mình trong khi có người khác hiện diện trực tiếp hoặc trực tuyến. Sự hiện diện có thể tạo thêm cấu trúc và trách nhiệm nhẹ." },
      { title: "Dùng cho việc khó bắt đầu", body: "Hãy chọn một nhiệm vụ nhỏ có điểm kết thúc rõ. Ví dụ: mở tài liệu và làm 5 câu đầu tiên, thay vì đặt mục tiêu mơ hồ như học cả chương." },
      { title: "Đặt giới hạn cho tương tác", body: "Không gian body doubling sẽ mất tác dụng nếu trở thành phòng trò chuyện liên tục. Hãy thống nhất khi nào được chat và khi nào mọi người tập trung." },
    ],
    steps: ["Vào một phòng chung.", "Nói rõ mục tiêu cá nhân.", "Bắt đầu phiên tập trung.", "Chia sẻ kết quả khi kết thúc nếu cần."],
    faq: [
      { q: "Body doubling có phải học cùng một môn không?", a: "Không. Mỗi người có thể làm nhiệm vụ riêng; điểm chung là cùng có mặt trong một khoảng thời gian." },
      { q: "Body doubling có giống coworking không?", a: "Khá giống ở ý tưởng cùng hiện diện để làm việc, nhưng body doubling nhấn mạnh hơn vào việc hỗ trợ bắt đầu và duy trì một nhiệm vụ cá nhân." },
    ],
  },
  "phong-hoc-online": {
    title: "Phòng học online miễn phí",
    description: "Phòng học online miễn phí để vào học cùng người khác, giữ nhịp bằng timer và theo dõi tiến độ tại still. room.",
    eyebrow: "ONLINE STUDY ROOM",
    intro: "Một phòng học online tốt phải làm việc dễ hơn, không tạo thêm lựa chọn. Hãy mở phòng, xác định mục tiêu, bắt đầu timer và học.",
    keywords: ["phòng học online", "study room", "phòng học trực tuyến", "học online cùng nhau"],
    sections: [
      { title: "Phòng học online nên có gì?", body: "Ít nhất cần một nơi để tập trung, một cách xác định thời gian và một quy tắc hạn chế xao nhãng. Các tính năng khác chỉ đáng giữ nếu chúng thực sự giúp bạn học." },
      { title: "Cách tổ chức một phòng học", body: "Mỗi phiên nên có một thời lượng chung và một thời điểm check-in/check-out rõ ràng. Không cần ai cũng làm cùng một môn." },
      { title: "Theo dõi sau phiên", body: "Ghi lại số phút tập trung và việc đã hoàn thành. Điều này giúp bạn xây lịch học dựa trên khả năng thực tế thay vì lịch quá đẹp trên giấy." },
    ],
    steps: ["Chọn phòng.", "Đặt mục tiêu và thời lượng.", "Học cùng mọi người.", "Kết thúc phiên và ghi nhận kết quả."],
    faq: [
      { q: "Phòng học online có phù hợp khi ôn thi?", a: "Có. Đây là cách tạo khung giờ học cố định và thêm trách nhiệm nhẹ bằng sự hiện diện của người khác." },
      { q: "Có cần bật camera không?", a: "Không bắt buộc. Camera là một tùy chọn giúp tăng cảm giác hiện diện, nhưng sự tập trung mới là mục tiêu chính." },
    ],
  },
  "timer-on-thi": {
    title: "Timer ôn thi: chia phiên học hiệu quả",
    description: "Timer ôn thi online giúp chia buổi học thành các phiên nhỏ, phân bổ thời gian giữa các môn và giảm trì hoãn.",
    eyebrow: "EXAM TIMER",
    intro: "Khi có nhiều môn, vấn đề thường không phải thiếu thời gian mà là không biết bắt đầu từ đâu. Timer giúp bạn biến một khối thời gian lớn thành các nhiệm vụ nhỏ.",
    keywords: ["timer ôn thi", "timer học", "pomodoro ôn thi", "study timer exam"],
    sections: [
      { title: "Chia thời gian theo nhiệm vụ", body: "Thay vì đặt mục tiêu học cả môn, chia thành các nhiệm vụ có đầu ra: chữa một đề, làm một nhóm câu hỏi hoặc tóm tắt một chủ đề." },
      { title: "Ưu tiên truy hồi thay vì chỉ đọc", body: "Sau khi học một phần, đóng tài liệu và tự nhớ lại các ý chính hoặc làm câu hỏi. Cách học chủ động này giúp bạn kiểm tra phần còn yếu thay vì chỉ thấy quen mắt." },
      { title: "Để lại thời gian cho nghỉ và ngủ", body: "Ôn thi hiệu quả không đồng nghĩa thức càng lâu càng tốt. Lịch học cần có thời gian nghỉ và ngủ để duy trì khả năng tập trung." },
    ],
    steps: ["Chọn môn và nhiệm vụ.", "Đặt timer.", "Học chủ động trong phiên.", "Nghỉ rồi chuyển sang phiên tiếp theo."],
    faq: [
      { q: "Nên dùng timer ôn thi bao lâu?", a: "Bắt đầu bằng một phiên bạn có thể tập trung tốt, sau đó điều chỉnh. Nhiệm vụ khó có thể cần phiên dài hơn nhiệm vụ lặp lại." },
      { q: "Có nên học xuyên đêm trước kỳ thi?", a: "Không nên xem thiếu ngủ là chiến lược mặc định. Hãy ưu tiên kế hoạch ôn tập có khoảng nghỉ và thời gian ngủ phù hợp." },
    ],
  },
  "habit-tracker": {
    title: "Habit Tracker cho thói quen học tập",
    description: "Habit Tracker online để theo dõi thói quen học tập, streak và số phiên tập trung theo ngày trên still. room.",
    eyebrow: "HABIT TRACKER",
    intro: "Thói quen bền hơn khi được định nghĩa thành hành vi nhỏ có thể lặp lại. Theo dõi đều đặn giúp bạn nhìn thấy tiến độ thay vì chỉ nhớ những ngày tốt.",
    keywords: ["habit tracker", "study habit tracker", "theo dõi thói quen học", "streak học tập"],
    sections: [
      { title: "Một thói quen tốt nên nhỏ đến mức nào?", body: "Hãy bắt đầu bằng hành vi có thể hoàn thành ngay cả trong ngày bận: một phiên tập trung, 20 phút đọc hoặc 10 câu bài tập. Khi nhịp đã ổn, bạn mới tăng quy mô." },
      { title: "Streak có ý nghĩa gì?", body: "Streak chỉ là tín hiệu về tính đều đặn, không phải thước đo giá trị của bạn. Bỏ lỡ một ngày không làm mất toàn bộ tiến bộ." },
      { title: "Kết hợp habit với timer", body: "Một thói quen có thể gắn với một hành vi cụ thể: mỗi ngày hoàn thành ít nhất một phiên focus. Cách này biến mục tiêu mơ hồ thành điều có thể kiểm tra." },
    ],
    steps: ["Chọn một hành vi học cụ thể.", "Đặt mức tối thiểu có thể lặp lại.", "Đánh dấu sau khi hoàn thành.", "Xem xu hướng theo tuần."],
    faq: [
      { q: "Có nên theo dõi quá nhiều thói quen?", a: "Không nên bắt đầu quá nhiều. Một hoặc hai hành vi rõ ràng thường dễ duy trì hơn một danh sách dài." },
      { q: "Một ngày bỏ lỡ có sao không?", a: "Không. Hãy quay lại ngay phiên tiếp theo thay vì cố bù quá mức." },
    ],
  },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(GUIDES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDES[slug];
  if (!guide) return {};
  const url = `/cong-cu/${slug}`;
  return {
    title: guide.title,
    description: guide.description,
    keywords: guide.keywords,
    alternates: { canonical: url },
    openGraph: { type: "article", url, siteName: "still. room", title: guide.title, description: guide.description, locale: "vi_VN" },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = GUIDES[slug];
  if (!guide) notFound();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: guide.title,
    step: guide.steps.map((text) => ({ "@type": "HowToStep", text })),
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f4f4f0", color: "#111" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "52px 22px 82px" }}>
        <nav style={{ fontSize: 13, marginBottom: 44 }}>
          <Link href="/" style={{ color: "#666", textDecoration: "none" }}>still. room</Link>
          <span style={{ margin: "0 8px", color: "#aaa" }}>/</span>
          <span>{guide.eyebrow}</span>
        </nav>

        <header style={{ maxWidth: 800 }}>
          <div style={{ fontSize: 12, letterSpacing: ".16em", fontWeight: 800, color: "#777" }}>{guide.eyebrow}</div>
          <h1 style={{ fontSize: "clamp(38px, 6vw, 68px)", lineHeight: .96, letterSpacing: "-.055em", margin: "16px 0" }}>{guide.title}</h1>
          <p style={{ fontSize: 20, lineHeight: 1.62, color: "#666", margin: 0 }}>{guide.intro}</p>
        </header>

        <section style={{ marginTop: 34, display: "grid", gap: 16 }}>
          {guide.sections.map((section) => (
            <article key={section.title} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 22, padding: 26 }}>
              <h2 style={{ margin: "0 0 10px", fontSize: 24 }}>{section.title}</h2>
              <p style={{ margin: 0, lineHeight: 1.78, color: "#555" }}>{section.body}</p>
            </article>
          ))}

          <article style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 22, padding: 26 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 24 }}>Cách bắt đầu</h2>
            <ol style={{ margin: 0, paddingLeft: 22, lineHeight: 1.9 }}>
              {guide.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </article>

          <article style={{ background: "#111", color: "#fff", borderRadius: 22, padding: 26 }}>
            <div style={{ fontSize: 11, letterSpacing: ".14em", color: "#999" }}>STILL. ROOM</div>
            <h2 style={{ margin: "8px 0" }}>Mở không gian tập trung</h2>
            <p style={{ color: "#bbb", lineHeight: 1.7, margin: 0 }}>Timer, nhiệm vụ, thói quen, thống kê và phòng học chung trong một nơi.</p>
            <Link href="/" style={{ display: "inline-block", marginTop: 14, padding: "11px 17px", borderRadius: 999, background: "#fff", color: "#111", textDecoration: "none", fontWeight: 800 }}>Vào still. room →</Link>
          </article>

          <article style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 22, padding: 26 }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 24 }}>Câu hỏi thường gặp</h2>
            <div style={{ display: "grid", gap: 18 }}>
              {guide.faq.map((item) => (
                <div key={item.q}>
                  <h3 style={{ margin: "0 0 6px", fontSize: 17 }}>{item.q}</h3>
                  <p style={{ margin: 0, color: "#666", lineHeight: 1.7 }}>{item.a}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <footer style={{ marginTop: 40, paddingTop: 22, borderTop: "1px solid #ddd", fontSize: 13, color: "#777", lineHeight: 2 }}>
          Khám phá:{" "}
          {Object.keys(GUIDES).map((key, index) => (
            <span key={key}>
              <Link href={`/cong-cu/${key}`} style={{ color: "#222" }}>{GUIDES[key].eyebrow}</Link>
              {index < Object.keys(GUIDES).length - 1 ? " · " : ""}
            </span>
          ))}
        </footer>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
    </main>
  );
}
