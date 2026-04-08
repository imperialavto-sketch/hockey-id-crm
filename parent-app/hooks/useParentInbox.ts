import { useState, useCallback, useMemo, useRef, useEffect } from "react";

import { useAuth } from "@/context/AuthContext";
import { getConversations } from "@/services/chatService";
import { getTeamAnnouncementsInboxSummary } from "@/services/teamAnnouncementsService";
import type { ConversationItem } from "@/types/chat";
import type { TeamAnnouncementsInboxSummary } from "@/types/teamAnnouncement";
import { buildParentInboxList, type ParentInboxItem } from "@/lib/parentInboxModel";
import { useParentAttention } from "@/context/ParentAttentionContext";
import { getCoachMarkContext } from "@/services/coachMarkContextService";

export function useParentInbox() {
  const { user } = useAuth();
  const { syncMessagesAttentionFromInbox } = useParentAttention();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [teamSummary, setTeamSummary] = useState<TeamAnnouncementsInboxSummary>({
    status: "no_channel",
    reason: "error",
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [coachMarkCtx, setCoachMarkCtx] = useState<{
    playerId?: string | null;
    playerName?: string | null;
  } | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
      return;
    }
    if (mountedRef.current) setLoadError(false);
    try {
      const [data, team] = await Promise.all([
        getConversations(user.id),
        getTeamAnnouncementsInboxSummary(user.id),
      ]);
      const cmCtx = await getCoachMarkContext();
      if (!mountedRef.current) return;
      const nextConversations = Array.isArray(data) ? data : [];
      setCoachMarkCtx(cmCtx);
      setConversations(nextConversations);
      setTeamSummary(team);
      syncMessagesAttentionFromInbox(
        buildParentInboxList(user.id, nextConversations, team, cmCtx)
      );
    } catch {
      if (mountedRef.current) {
        setConversations([]);
        setTeamSummary({ status: "no_channel", reason: "error" });
        setLoadError(true);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [syncMessagesAttentionFromInbox, user?.id]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const items = useMemo<ParentInboxItem[]>(
    () =>
      user?.id
        ? buildParentInboxList(user.id, conversations, teamSummary, coachMarkCtx)
        : [],
    [user?.id, conversations, teamSummary, coachMarkCtx]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    void load();
  }, [load]);

  return {
    user,
    items,
    conversations,
    teamSummary,
    loading,
    refreshing,
    loadError,
    load,
    onRefresh,
    handleRetry,
  };
}
