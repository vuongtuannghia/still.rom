import { CommunityShell } from "../components/community-shell";
import { DirectMessagesPage } from "../components/direct-messages-page";

export default function MessagesRoute() {
  return <CommunityShell active="messages" eyebrow="TIN NHẮN · RIÊNG TƯ" title="Tin nhắn" description="Nhắn riêng với những người bạn muốn học cùng."><DirectMessagesPage /></CommunityShell>;
}
