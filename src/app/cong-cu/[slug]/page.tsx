import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Guide = {
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  keywords: string[];
  paragraphs: { title: string; body: string }[];
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
    paragraphs: [
      { title: "Pomodoro hoạt động như thế nào?", body: "Pomodoro chia công việc thành các khoảng tập trung xen kẽ nghỉ ngắn. Điểm quan trọng không phải một con số cố định, mà là tạo ra nhịp làm việc có điểm bắt đầu và kết thúc rõ ràng. Khi bạn biết phiên sẽ kết thúc lúc nào, việc bắt đầu một nhiệm vụ lớn thường bớt nặng nề hơn." },
      { title: "Dùng Pomodoro khi ôn thi", body: "Gắn mỗi phiên với một đầu ra cụ thể: làm một nhóm câu hỏi, chữa một phần đề, đọc một mục giáo trình hoặc viết một đoạn bài. Sau phiên, ghi lại kết quả thay vì chỉ ghi rằng bạn đã ngồi học. Sau vài ngày, dữ liệu này cho bạn biết từng loại nhiệm vụ thật sự tốn bao nhiêu thời gian." },
      { title: "Chọn thời lượng theo nhiệm vụ", body: "25/5 là một cấu hình phổ biến nhưng không phải luật. Nhiệm vụ đọc sâu có thể cần phiên dài hơn, còn bài tập lặp lại có thể hợp với phiên ngắn. Hãy chọn thời lượng bạn có thể duy trì mà không biến timer thành áp lực." },
    ],
    steps: ["Chọn một nhiệm vụ duy nhất.", "Đặt thời lượng phù hợp.", "Học đến khi timer kết thúc.", "Nghỉ ngắn và xem lại kết quả."],
    faq: [
      { q: "Pomodoro có bắt buộc 25/5 không?", a: "Không. 25/5 chỉ là một cấu hình phổ biến; bạn có thể điều chỉnh theo nhiệm vụ và khả năng tập trung của mình." },
      { q: "Pomodoro có hợp để ôn thi không?", a: "Có. Nó giúp chia buổi học thành các nhiệm vụ nhỏ và cho bạn dữ liệu thực tế về thời gian đã học." },
    ],
  },
  "focus-timer": {
    title: "Focus Timer online miễn phí",
    description: "Focus Timer online tối giản cho học và làm việc: đặt mục tiêu, bắt đầu phiên tập trung và theo dõi tiến độ.",
    eyebrow: "FOCUS TIMER",
    intro: "Focus Timer hữu ích khi bạn muốn bỏ bớt quyết định và chỉ tập trung vào việc đang làm. still. room đặt timer ở trung tâm của một không gian ít xao nhãng.",
    keywords: ["focus timer", "study timer", "đồng hồ tập trung", "timer học"],
    paragraphs: [
      { title: "Bắt đầu bằng đầu ra, không phải số phút", body: "Trước khi bấm Start, viết một câu mô tả thứ bạn muốn hoàn thành. Ví dụ: giải 10 bài tập, tóm tắt hai trang hoặc viết phần mở đầu. Mục tiêu rõ giúp timer đo được một phiên có kết quả hay không, thay vì chỉ đo bạn đã ngồi bao lâu." },
      { title: "Đo thời gian tập trung thật", body: "Thời gian có mặt trước bàn không đồng nghĩa với thời gian tập trung. Lịch sử các phiên giúp bạn nhận ra khung giờ, môn học hoặc loại nhiệm vụ nào dễ tập trung hơn. Khi có dữ liệu, bạn có thể thiết kế lịch học thực tế thay vì lịch quá đẹp trên giấy." },
      { title: "Giảm xao nhãng trong phiên", body: "Tắt thông báo, đóng những tab không cần và để điện thoại ngoài tầm tay. Timer không thay thế kỷ luật; nó tạo ra một ranh giới thời gian rõ để bạn giữ một nhiệm vụ trong suốt phiên." },
    ],
    steps: ["Viết đầu ra của phiên.", "Chọn thời lượng.", "Bắt đầu timer và chỉ làm một việc.", "Kiểm tra lịch sử sau phiên."],
    faq: [
      { q: "Focus Timer khác đồng hồ đếm ngược thường thế nào?", a: "Focus Timer được dùng như một nghi thức bắt đầu và kết thúc phiên tập trung, thường đi cùng mục tiêu hoặc lịch sử phiên." },
      { q: "Nên focus bao lâu?", a: "Không có một con số tối ưu cho mọi người. Hãy bắt đầu bằng thời lượng bạn có thể duy trì ổn định rồi điều chỉnh theo dữ liệu." },
    ],
  },
  "hoc-cung-nhau": {
    title: "Học cùng nhau online miễn phí",
    description: "Học cùng nhau online trong phòng học của still. room: tạo nhịp học, kết nối với người khác và theo dõi thời gian tập trung.",
    eyebrow: "HỌC CÙNG NHAU",
    intro: "Học chung hiệu quả nhất khi mọi người cùng có một mục tiêu và một khung thời gian. still. room kết hợp study room với timer, nhiệm vụ và thống kê.",
    keywords: ["học cùng nhau online", "học chung online", "phòng học online", "study room"],
    paragraphs: [
      { title: "Vì sao học chung có thể dễ bắt đầu hơn?", body: "Một phòng học chung tạo ra cảm giác bạn không phải tự bắt đầu một mình. Đây là ý tưởng gần với body doubling: sự hiện diện của người khác tạo thêm cấu trúc và trách nhiệm nhẹ, dù mỗi người có thể đang làm một nhiệm vụ khác nhau." },
      { title: "Chuẩn bị trước khi vào phòng", body: "Xác định môn học, đầu ra và thời lượng trước khi mở phòng. Khi đã bắt đầu, hạn chế việc biến phòng học thành nơi trò chuyện liên tục. Mục tiêu là tạo một khung giờ để làm việc, không phải thêm một kênh thông báo." },
      { title: "Kết hợp phòng học với timer", body: "Bạn có thể chia buổi học thành các phiên tập trung và nghỉ. Sau mỗi phiên, ghi nhận việc đã hoàn thành. Cách này giúp việc học chung vẫn gắn với tiến độ cá nhân thay vì chỉ dựa vào cảm giác rằng bạn đã học rất lâu." },
    ],
    steps: ["Chọn một phòng.", "Đặt mục tiêu cá nhân.", "Bắt đầu phiên học chung.", "Ghi lại kết quả sau phiên."],
    faq: [
      { q: "Học cùng nhau online có phải livestream không?", a: "Không. Study room có thể là phòng học trực tiếp, phòng video hoặc không gian cộng tác nơi mỗi người học theo mục tiêu riêng." },
      { q: "Có cần bật camera không?", a: "Không bắt buộc. Camera chỉ là một cách tăng cảm giác hiện diện; mục tiêu chính vẫn là tập trung." },
    ],
  },
  "study-with-me": {
    title: "Study With Me online để giữ nhịp học",
    description: "Study With Me online với focus timer, ambient sound và phòng học chung để tạo một không gian học yên.",
    eyebrow: "STUDY WITH ME",
    intro: "Study With Me biến việc bắt đầu thành một hoạt động có bối cảnh. Bạn không cần chờ có động lực; hãy tạo một nghi thức bắt đầu và lặp lại nó.",
    keywords: ["study with me", "study with me online", "study room online", "học cùng nhau"],
    paragraphs: [
      { title: "Tạo một bối cảnh học ổn định", body: "Một setup lặp lại có thể giảm số quyết định trước khi bạn học: cùng một cảnh nền, cách bật timer và cách kết thúc phiên. still. room cung cấp các công cụ để gom những bước này vào một nơi." },
      { title: "Đừng biến Study With Me thành giải trí", body: "Video hoặc âm thanh nền chỉ đáng dùng khi chúng giúp bạn duy trì chú ý. Nếu bạn liên tục chuyển video, đọc bình luận hoặc mở tab khác, hãy đơn giản hóa setup. Một không gian yên thường có giá trị hơn một giao diện nhiều thứ để khám phá." },
      { title: "Kết thúc có chủ đích", body: "Khi timer kết thúc, ghi lại một dòng về việc đã hoàn thành. Việc chốt phiên giúp bạn biết lần sau nên tiếp tục từ đâu và biến một chuỗi buổi học thành tiến độ nhìn thấy được." },
    ],
    steps: ["Chọn bối cảnh.", "Bật Focus Timer.", "Học theo một mục tiêu.", "Ghi nhận kết quả."],
    faq: [
      { q: "Study With Me có phải xem video không?", a: "Không. Bạn có thể chỉ dùng một phòng học chung, timer hoặc âm thanh nền nếu cấu hình đó giúp bạn ít xao nhãng hơn." },
      { q: "Study With Me có hợp khi ôn thi không?", a: "Có, miễn là bạn vẫn đặt mục tiêu học cụ thể và kiểm tra kết quả sau phiên." },
    ],
  },
  "study-timer": {
    title: "Study Timer online miễn phí",
    description: "Study Timer online cho học sinh và sinh viên: chia buổi học thành phiên, theo dõi thời gian và giữ nhịp ôn tập.",
    eyebrow: "STUDY TIMER",
    intro: "Study Timer giúp biến một buổi học dài thành các đoạn dễ bắt đầu. Mục tiêu không phải học lâu hơn bằng mọi giá, mà là nhìn thấy thời gian học thật.",
    keywords: ["study timer", "study timer online", "timer học bài", "đồng hồ học tập"],
    paragraphs: [
      { title: "Dùng timer cho nhiều môn", body: "Mỗi phiên nên gắn với một môn hoặc một loại nhiệm vụ. Khi đổi môn, bắt đầu phiên mới để lịch sử của bạn phản ánh thời gian thực tế. Điều này hữu ích khi bạn cần cân bằng nhiều môn trong cùng một ngày." },
      { title: "Ôn thi theo tuần", body: "Cuối ngày, nhìn tổng số phiên và tổng thời gian. Cuối tuần, xem môn nào chiếm nhiều thời gian nhưng vẫn tiến bộ chậm. Dữ liệu không tự tạo ra lịch học tốt, nhưng nó giúp bạn sửa những ước lượng sai." },
      { title: "Bắt đầu từ phiên có thể hoàn thành", body: "Ngày học kém vẫn có thể bắt đầu bằng một phiên vừa sức. Vượt qua ma sát khởi động quan trọng hơn việc đặt một mục tiêu quá lớn rồi bỏ dở ngay từ đầu." },
    ],
    steps: ["Viết nhiệm vụ học.", "Chọn thời lượng.", "Học đến khi timer kết thúc.", "Xem lại tiến độ."],
    faq: [
      { q: "Study Timer có phù hợp với sinh viên không?", a: "Có. Nó phù hợp với bài tập, đọc giáo trình, học ngoại ngữ, làm đồ án và ôn thi." },
      { q: "Nên dùng 25 hay 50 phút?", a: "Hãy thử cả hai theo từng loại nhiệm vụ. Phiên tốt là phiên bạn có thể giữ tập trung và hoàn thành đầu ra." },
    ],
  },
  "lofi-focus": {
    title: "Lo-fi Focus Timer cho giờ học",
    description: "Lo-fi Focus Timer kết hợp bộ đếm tập trung với âm thanh nền để tạo không gian học ổn định trên still. room.",
    eyebrow: "LO-FI FOCUS",
    intro: "Âm thanh nền có thể che tiếng ồn bất chợt và tạo tín hiệu bắt đầu buổi học. Nhưng âm thanh chỉ đáng giữ nếu nó không cạnh tranh với tài liệu.",
    keywords: ["lofi focus timer", "lofi study timer", "study sounds", "ambient focus"],
    paragraphs: [
      { title: "Khi nào nên dùng âm thanh nền?", body: "Âm thanh đều và quen thuộc có thể phù hợp với những phiên cần duy trì nhịp. Một số nhiệm vụ lại cần im lặng tuyệt đối. Hãy đánh giá âm thanh bằng một câu hỏi đơn giản: nó làm bạn quên môi trường xung quanh hay khiến bạn chú ý vào chính nó?" },
      { title: "Kết hợp timer và YouTube", body: "Bạn có thể dùng study-with-me, mưa, quán cà phê hoặc video bài học làm nền. Khi đó, hãy để timer làm bộ điều khiển thời gian chính để giờ nghỉ không phụ thuộc vào điểm kết thúc của video." },
      { title: "Giữ setup nhất quán", body: "Một cấu hình âm thanh quen thuộc giúp giảm số bước trước khi bắt đầu. Sau vài ngày, bạn có thể biết kiểu âm thanh nào hợp với đọc, bài tập, viết hoặc ôn lại." },
    ],
    steps: ["Chọn âm thanh nền.", "Đặt timer.", "Tập trung vào một nhiệm vụ.", "Tắt âm thanh nếu nó gây xao nhãng."],
    faq: [
      { q: "Lo-fi có bắt buộc khi học không?", a: "Không. Im lặng cũng là một lựa chọn tốt nếu nó giúp bạn ít bị kéo sự chú ý hơn." },
      { q: "Có thể dùng YouTube cùng timer không?", a: "Có. Bạn có thể để video chạy bên cạnh trong khi timer quản lý thời lượng phiên." },
    ],
  },
  "body-doubling": {
    title: "Body Doubling online cho học tập",
    description: "Body doubling online tạo cảm giác đang làm việc cùng người khác. still. room kết hợp body doubling với phòng học và focus timer.",
    eyebrow: "BODY DOUBLING",
    intro: "Body doubling tập trung vào sự hiện diện. Bạn không nhất thiết phải làm cùng một việc với người khác; điều quan trọng là có một khung giờ để bắt đầu và duy trì nhiệm vụ.",
    keywords: ["body doubling", "body doubling online", "virtual coworking", "study together"],
    paragraphs: [
      { title: "Body doubling là gì?", body: "Đó là cách làm việc trong đó bạn thực hiện nhiệm vụ cá nhân trong khi có người khác hiện diện trực tiếp hoặc trực tuyến. Sự hiện diện có thể tạo thêm cấu trúc và giảm cảm giác phải tự khởi động một mình." },
      { title: "Dùng cho việc khó bắt đầu", body: "Chọn một việc nhỏ có điểm kết thúc rõ, chẳng hạn mở tài liệu và làm 5 câu đầu, thay vì đặt mục tiêu mơ hồ như học cả chương. Khi đã bắt đầu, bạn có thể kéo dài phiên nếu thấy cần." },
      { title: "Giữ giới hạn tương tác", body: "Nếu phòng học biến thành phòng trò chuyện liên tục, tác dụng của body doubling giảm mạnh. Hãy thống nhất thời gian tập trung và thời gian được chat để bảo toàn nhịp làm việc." },
    ],
    steps: ["Vào phòng chung.", "Nói rõ mục tiêu.", "Chạy một phiên tập trung.", "Chia sẻ kết quả khi cần."],
    faq: [
      { q: "Có phải làm cùng một môn không?", a: "Không. Mỗi người có thể có nhiệm vụ riêng; sự hiện diện chung mới là phần cốt lõi." },
      { q: "Body doubling có giống coworking không?", a: "Khá giống ở việc cùng hiện diện để làm việc, nhưng body doubling nhấn mạnh hơn vào việc hỗ trợ bắt đầu và duy trì nhiệm vụ cá nhân." },
    ],
  },
  "phong-hoc-online": {
    title: "Phòng học online miễn phí",
    description: "Phòng học online miễn phí để vào học cùng người khác, giữ nhịp bằng timer và theo dõi tiến độ tại still. room.",
    eyebrow: "ONLINE STUDY ROOM",
    intro: "Một phòng học online tốt phải làm việc dễ hơn, không tạo thêm lựa chọn. Hãy mở phòng, xác định mục tiêu, bắt đầu timer và học.",
    keywords: ["phòng học online", "study room", "phòng học trực tuyến", "học online cùng nhau"],
    paragraphs: [
      { title: "Một phòng học online cần gì?", body: "Ít nhất cần một nơi để tập trung, một cách xác định thời gian và một quy tắc hạn chế xao nhãng. Tính năng khác chỉ đáng giữ nếu nó thực sự làm nhiệm vụ học dễ hơn." },
      { title: "Cách tổ chức một phiên", body: "Chọn một thời lượng chung và một thời điểm check-in/check-out. Không cần ai cũng học cùng môn. Điều quan trọng là mỗi người biết mình sẽ hoàn thành gì trước khi vào phòng." },
      { title: "Theo dõi sau phiên", body: "Ghi lại số phút tập trung và đầu ra. Sau một tuần, bạn có thể so sánh những ngày có lịch học cố định với những ngày học tùy hứng để tìm nhịp phù hợp hơn." },
    ],
    steps: ["Chọn phòng.", "Đặt mục tiêu và thời lượng.", "Học cùng mọi người.", "Kết thúc và ghi nhận kết quả."],
    faq: [
      { q: "Phòng học online có hợp để ôn thi?", a: "Có. Nó tạo một khung giờ rõ và thêm trách nhiệm nhẹ bằng sự hiện diện của người khác." },
      { q: "Có cần camera không?", a: "Không. Camera là tùy chọn; sự tập trung vẫn là mục tiêu chính." },
    ],
  },
  "timer-on-thi": {
    title: "Timer ôn thi: chia phiên học hiệu quả",
    description: "Timer ôn thi online giúp chia buổi học thành các phiên nhỏ, phân bổ thời gian giữa các môn và giảm trì hoãn.",
    eyebrow: "EXAM TIMER",
    intro: "Khi có nhiều môn, vấn đề thường không phải thiếu thời gian mà là khó biết bắt đầu từ đâu. Timer giúp biến một khối thời gian lớn thành nhiệm vụ nhỏ.",
    keywords: ["timer ôn thi", "timer học", "pomodoro ôn thi", "study timer exam"],
    paragraphs: [
      { title: "Chia thời gian theo nhiệm vụ", body: "Thay vì đặt mục tiêu học cả môn, chia thành các đầu ra: chữa một đề, làm một nhóm câu hỏi hoặc tóm tắt một chủ đề. Mỗi phiên chỉ cần trả lời được câu hỏi: sau khoảng thời gian này tôi đã hoàn thành gì?" },
      { title: "Học chủ động trong phiên", body: "Sau khi đọc một phần, đóng tài liệu và tự nhớ lại các ý chính hoặc làm câu hỏi. Cách học chủ động giúp bạn kiểm tra phần còn yếu thay vì chỉ nhận ra rằng nội dung trông quen mắt." },
      { title: "Không biến thức khuya thành chiến lược", body: "Một lịch ôn thi tốt vẫn cần nghỉ và ngủ. Mục tiêu của timer là giúp bạn sử dụng thời gian tập trung có chất lượng, không phải tối đa hóa số giờ ngồi trước bàn." },
    ],
    steps: ["Chọn môn và nhiệm vụ.", "Đặt timer.", "Học chủ động trong phiên.", "Nghỉ rồi chuyển sang phiên tiếp theo."],
    faq: [
      { q: "Nên dùng timer ôn thi bao lâu?", a: "Bắt đầu bằng thời lượng bạn tập trung tốt rồi điều chỉnh theo nhiệm vụ. Không có một mốc duy nhất phù hợp cho mọi môn." },
      { q: "Có nên học xuyên đêm trước kỳ thi?", a: "Không nên xem thiếu ngủ là chiến lược mặc định. Lịch học nên có khoảng nghỉ và thời gian ngủ hợp lý." },
    ],
  },
  "habit-tracker": {
    title: "Habit Tracker cho thói quen học tập",
    description: "Habit Tracker online để theo dõi thói quen học tập, streak và số phiên tập trung theo ngày trên still. room.",
    eyebrow: "HABIT TRACKER",
    intro: "Thói quen bền hơn khi được định nghĩa thành hành vi nhỏ có thể lặp lại. Theo dõi đều đặn giúp bạn nhìn thấy tiến độ thay vì chỉ nhớ những ngày tốt.",
    keywords: ["habit tracker", "study habit tracker", "theo dõi thói quen học", "streak học tập"],
    paragraphs: [
      { title: "Định nghĩa một thói quen nhỏ", body: "Bắt đầu bằng hành vi có thể hoàn thành ngay cả trong ngày bận: một phiên focus, 20 phút đọc hoặc 10 câu bài tập. Khi nhịp đã ổn, bạn mới tăng quy mô. Một mục tiêu nhỏ nhưng lặp lại tốt hơn một mục tiêu lớn chỉ làm được vài ngày." },
      { title: "Streak là tín hiệu, không phải điểm số", body: "Streak cho biết tính đều đặn, nhưng không phải thước đo giá trị của bạn. Bỏ lỡ một ngày không xóa toàn bộ tiến bộ. Mục tiêu là quay lại nhanh thay vì cố bù quá mức." },
      { title: "Gắn habit với timer", body: "Bạn có thể gắn một habit với một hành vi cụ thể, chẳng hạn mỗi ngày hoàn thành ít nhất một phiên focus. Khi hành vi được định nghĩa rõ, việc đánh dấu trở nên đơn giản và dữ liệu trở nên hữu ích hơn." },
    ],
    steps: ["Chọn một hành vi cụ thể.", "Đặt mức tối thiểu có thể lặp lại.", "Đánh dấu sau khi hoàn thành.", "Xem xu hướng theo tuần."],
    faq: [
      { q: "Có nên theo dõi nhiều thói quen cùng lúc?", a: "Không nên bắt đầu quá nhiều. Một hoặc hai hành vi rõ ràng thường dễ duy trì hơn một danh sách dài." },
      { q: "Một ngày bỏ lỡ có sao không?", a: "Không. Hãy quay lại ở phiên tiếp theo thay vì cố bù quá mức." },
    ],
  },
  "aesthetic-study-timer": {
    title: "Aesthetic Study Timer online",
    description: "Aesthetic Study Timer tối giản cho những buổi học cần một không gian đẹp, ít xao nhãng và có timer tập trung.",
    eyebrow: "AESTHETIC STUDY",
    intro: "Giao diện đẹp chỉ có ích khi nó làm bạn muốn quay lại bàn học. still. room đặt phần thẩm mỹ sau mục tiêu ít xao nhãng và bắt đầu nhanh.",
    keywords: ["aesthetic study timer", "aesthetic timer", "study timer", "aesthetic study"],
    paragraphs: [
      { title: "Một timer đẹp vẫn phải dễ dùng", body: "Timer nên giúp bạn bắt đầu nhanh, nhìn thời gian rõ và không cạnh tranh sự chú ý với tài liệu. Phần thẩm mỹ chỉ nên tạo bối cảnh và cảm giác ổn định, không biến thành một nguồn xao nhãng mới." },
      { title: "Tạo một góc học có thể lặp lại", body: "Chọn một cảnh nền, âm thanh và cách bắt đầu quen thuộc cho những buổi học tương tự. Một setup nhất quán giảm số quyết định trước khi bạn ngồi xuống và tạo tín hiệu rõ rằng phiên học đã bắt đầu." },
      { title: "Kết hợp timer với nhiệm vụ", body: "Đừng chỉ đặt mục tiêu 60 phút. Hãy ghi rõ bạn sẽ hoàn thành gì trong phiên. Khi timer kết thúc, bạn có một kết quả để kiểm tra thay vì chỉ có một con số trên đồng hồ." },
    ],
    steps: ["Chọn bối cảnh học.", "Viết mục tiêu.", "Bật timer và tập trung.", "Ghi lại kết quả."],
    faq: [
      { q: "Aesthetic Study Timer khác Study Timer thường không?", a: "Chức năng cốt lõi vẫn là quản lý thời gian. Điểm khác là bối cảnh giao diện và các yếu tố ambient giúp tạo không gian học ổn định." },
      { q: "Nên ưu tiên đẹp hay ít xao nhãng?", a: "Ưu tiên ít xao nhãng. Thẩm mỹ chỉ nên hỗ trợ việc bắt đầu và duy trì phiên học." },
    ],
  },
  "forest-alternative": {
    title: "Forest alternative miễn phí cho học tập",
    description: "Một Forest alternative thiên về study room, focus timer, thói quen và thống kê thay vì chỉ trồng cây.",
    eyebrow: "FOREST ALTERNATIVE",
    intro: "Nếu bạn thích ý tưởng tập trung bằng một nghi thức trực quan nhưng muốn thêm phòng học chung, nhiệm vụ và thống kê, still. room đi theo hướng khác.",
    keywords: ["forest alternative", "forest app alternative", "focus timer alternative", "study app alternative"],
    paragraphs: [
      { title: "still. room đi theo hướng nào?", body: "still. room không cố tái tạo mọi cơ chế của Forest. Thay vào đó, hệ thống gom focus timer, nhiệm vụ, habits, thống kê, ambient sound và study room vào một không gian dành cho việc học." },
      { title: "Khi nào một công cụ khác có thể phù hợp hơn?", body: "Nếu bạn chỉ cần một timer cực đơn giản, một ứng dụng chuyên biệt có thể đã đủ. still. room phù hợp hơn khi bạn muốn timer trở thành trung tâm của một hệ thống học tập có cộng đồng và theo dõi tiến độ." },
      { title: "Đánh giá bằng một phiên thật", body: "Đừng quyết định chỉ bằng danh sách tính năng. Hãy chạy một phiên tập trung, hoàn thành một nhiệm vụ và xem bạn có muốn quay lại công cụ này vào ngày mai hay không. Trải nghiệm thực tế quan trọng hơn bảng so sánh." },
    ],
    steps: ["Mở still. room.", "Chọn một mục tiêu học.", "Chạy một phiên tập trung.", "Đánh giá trải nghiệm và tiến độ."],
    faq: [
      { q: "still. room có phải bản sao của Forest không?", a: "Không. Đây là một không gian tập trung khác, với trọng tâm vào học tập, study room, nhiệm vụ, habits và thống kê." },
      { q: "Forest alternative có miễn phí không?", a: "still. room hiện có các tính năng web cốt lõi có thể sử dụng mà không cần mua ứng dụng. Chính sách và tính năng có thể thay đổi theo thời gian." },
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

        <header style={{ maxWidth: 820 }}>
          <div style={{ fontSize: 12, letterSpacing: ".16em", fontWeight: 800, color: "#777" }}>{guide.eyebrow}</div>
          <h1 style={{ fontSize: "clamp(38px, 6vw, 68px)", lineHeight: .96, letterSpacing: "-.055em", margin: "16px 0" }}>{guide.title}</h1>
          <p style={{ fontSize: 20, lineHeight: 1.64, color: "#666", margin: 0 }}>{guide.intro}</p>
        </header>

        <section style={{ marginTop: 34, display: "grid", gap: 16 }}>
          {guide.paragraphs.map((section) => (
            <article key={section.title} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 22, padding: 26 }}>
              <h2 style={{ margin: "0 0 10px", fontSize: 24 }}>{section.title}</h2>
              <p style={{ margin: 0, lineHeight: 1.8, color: "#555" }}>{section.body}</p>
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
          <strong style={{ color: "#222" }}>Khám phá thêm:</strong>{" "}
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
