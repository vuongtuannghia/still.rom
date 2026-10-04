import { CommunityShell } from "../components/community-shell";
import { SharedStudyPage } from "../components/shared-study-page";

export default function SharedStudyRoute() {
  return <CommunityShell active="study" eyebrow="HỌC CHUNG · GOOGLE MEET" title="Học cùng nhau" description="Chọn một phòng, bật camera và học cùng mọi người."><SharedStudyPage /></CommunityShell>;
}
