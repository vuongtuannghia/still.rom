"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="recovery-page"><section><span className="eyebrow">STILL / ROOM</span><h1>Không gian tạm thời chưa tải được.</h1><p>Lỗi này không có nghĩa dữ liệu trên máy chủ đã bị xóa. Bạn có thể thử lại mà không cần xóa cookie hoặc bộ nhớ trình duyệt.</p><button className="button-primary" type="button" onClick={reset}>Thử tải lại</button><button className="button-secondary" type="button" onClick={() => window.location.reload()}>Làm mới trang</button></section></main>;
}
