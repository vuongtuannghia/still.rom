import { CommunityShell } from "../../components/community-shell";
import { DirectConversationPage } from "../../components/direct-conversation-page";

export default function DirectConversationRoute() {
  return <CommunityShell active="messages" eyebrow="TIN NHẮN · RIÊNG TƯ" title="Tin nhắn" description="Một cuộc trò chuyện riêng."><DirectConversationPage /></CommunityShell>;
}
