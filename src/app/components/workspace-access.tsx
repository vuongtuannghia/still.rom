"use client";

import { Icon } from "../icons";

export function WorkspaceAccessBar({ compact = false }: {
  compact?: boolean; onReconnected?: () => void | Promise<void>; disabled?: boolean;
}) {
  return <section className={`workspace-access-bar ${compact ? "compact-access" : ""} access-ready`} aria-label="Quyền của không gian cá nhân" data-access-state="ready">
    <div className="workspace-access-message" role="status" aria-live="polite">
      <span className="access-state-icon"><Icon name="check" size={16} /></span>
      <div>
        <strong>Dữ liệu được tự lưu trên thiết bị này</strong>
        {!compact && <span>Nhiệm vụ, thói quen, phiên tập trung, cài đặt và phòng học được giữ lại ngay cả khi bạn rời trang hoặc mở lại trình duyệt.</span>}
      </div>
    </div>
  </section>;
}
