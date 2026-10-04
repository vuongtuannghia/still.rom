import { CommunityShell } from "../components/community-shell";
import { DirectMessagesPage } from "../components/direct-messages-page";

export default function MessagesRoute() {
  return (
    <CommunityShell
      active="messages"
      eyebrow="TIN NHẮN · RIÊNG TƯ"
      title="Tin nhắn"
      description="Bạn bè ở hộp thư chính. Người lạ sẽ vào Tin nhắn chờ."
    >
      <DirectMessagesPage />
    </CommunityShell>
  );
}
