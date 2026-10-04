import { CommunityShell } from "@/app/components/community-shell";
import { FocusLeaderboard } from "@/app/components/focus-leaderboard";

export default function LeaderboardPage() {
  return (
    <CommunityShell
      active="leaderboard"
      eyebrow="FOCUS / RANKING"
      title="Bảng xếp hạng"
      description="Xem những người đang duy trì nhiều thời gian tập trung nhất trên still. room."
    >
      <FocusLeaderboard />
    </CommunityShell>
  );
}
