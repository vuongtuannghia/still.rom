import { CommunityShell } from "../components/community-shell";
import { ForumPage } from "../components/forum-page";

export default function ForumRoute() {
  return <CommunityShell active="forum" eyebrow="DIỄN ĐÀN · CỘNG ĐỒNG" title="Diễn đàn" description="Nói chuyện công khai, trả lời nhau hoặc nhắn riêng với bất kỳ người nào."><ForumPage /></CommunityShell>;
}
