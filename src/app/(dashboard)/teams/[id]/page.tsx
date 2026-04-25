import { loadTeamArenaAdoptionProxySnapshot } from "@/lib/arena/adoption/load-team-arena-adoption-proxy-snapshot";
import { TeamDetailPageClient } from "./TeamDetailPageClient";

const ARENA_FOCUS_APPLIED_WINDOW_DAYS = 30;

type PageProps = { params: { id: string } };

export default async function TeamDetailPage({ params }: PageProps) {
  const teamId = typeof params.id === "string" ? params.id.trim() : "";
  let arenaLiveFocusAppliedLast30Days: number | null = null;

  if (teamId) {
    try {
      const to = new Date();
      const from = new Date(to.getTime() - ARENA_FOCUS_APPLIED_WINDOW_DAYS * 86_400_000);
      const snap = await loadTeamArenaAdoptionProxySnapshot(teamId, { from, to });
      arenaLiveFocusAppliedLast30Days = snap.liveSessionsArenaFocusAppliedInWindow;
    } catch {
      arenaLiveFocusAppliedLast30Days = null;
    }
  }

  return <TeamDetailPageClient arenaLiveFocusAppliedLast30Days={arenaLiveFocusAppliedLast30Days} />;
}
