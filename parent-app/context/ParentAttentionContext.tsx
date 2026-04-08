import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";

import { useAuth } from "@/context/AuthContext";
import type { ParentInboxItem } from "@/lib/parentInboxModel";
import { computeMessagesAttention } from "@/lib/parentAttention";
import {
  fetchMessagesAttention,
  fetchNotificationsAttention,
} from "@/services/parentAttentionService";

export type ParentAttentionValue = {
  /** Сообщения: личный чат + объявления команд (из инбокса). */
  messagesHasUnread: boolean;
  messagesUnreadTotal: number;
  /** Центр уведомлений (записи в ленте уведомлений). */
  notificationsUnread: number;
  refreshAttention: (opts?: {
    includeMessages?: boolean;
    includeNotifications?: boolean;
  }) => Promise<void>;
  syncMessagesAttentionFromInbox: (items: ParentInboxItem[]) => void;
};

const defaultValue: ParentAttentionValue = {
  messagesHasUnread: false,
  messagesUnreadTotal: 0,
  notificationsUnread: 0,
  refreshAttention: async () => {},
  syncMessagesAttentionFromInbox: () => {},
};

const ParentAttentionContext =
  createContext<ParentAttentionValue>(defaultValue);

export function ParentAttentionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [messagesHasUnread, setMessagesHasUnread] = useState(false);
  const [messagesUnreadTotal, setMessagesUnreadTotal] = useState(0);
  const [notificationsUnread, setNotificationsUnread] = useState(0);
  const appStateRef = useRef(AppState.currentState);

  const syncMessagesAttentionFromInbox = useCallback((items: ParentInboxItem[]) => {
    const next = computeMessagesAttention(items);
    setMessagesHasUnread(next.hasUnread);
    setMessagesUnreadTotal(next.unreadTotal);
  }, []);

  const refreshAttention = useCallback(async (opts?: {
    includeMessages?: boolean;
    includeNotifications?: boolean;
  }) => {
    const id = user?.id;
    const includeMessages = opts?.includeMessages ?? true;
    const includeNotifications = opts?.includeNotifications ?? true;
    if (!id) {
      setMessagesHasUnread(false);
      setMessagesUnreadTotal(0);
      setNotificationsUnread(0);
      return;
    }
    try {
      const [messages, notifications] = await Promise.all([
        includeMessages ? fetchMessagesAttention(id) : Promise.resolve(null),
        includeNotifications
          ? fetchNotificationsAttention(id)
          : Promise.resolve(null),
      ]);
      if (messages) {
        setMessagesHasUnread(messages.hasUnread);
        setMessagesUnreadTotal(messages.unreadTotal);
      }
      if (typeof notifications === "number") {
        setNotificationsUnread(notifications);
      }
    } catch {
      // оставляем предыдущие значения — без скачков в ноль при сетевом сбое
    }
  }, [user?.id]);

  useEffect(() => {
    void refreshAttention();
  }, [refreshAttention]);

  useEffect(() => {
    if (Platform.OS === "web" || !user?.id) return;
    const sub = AppState.addEventListener("change", (next) => {
      if (appStateRef.current.match(/inactive|background/) && next === "active") {
        void refreshAttention();
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [user?.id, refreshAttention]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let cancelled = false;
    void import("expo-notifications").then(async (Notifications) => {
      if (cancelled) return;
      if (!user?.id) {
        await Notifications.setBadgeCountAsync(0);
        return;
      }
      const total = messagesUnreadTotal + notificationsUnread;
      await Notifications.setBadgeCountAsync(
        Math.min(Math.max(0, Math.floor(total)), 99999)
      );
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, messagesUnreadTotal, notificationsUnread]);

  const value = useMemo(
    () => ({
      messagesHasUnread,
      messagesUnreadTotal,
      notificationsUnread,
      refreshAttention,
      syncMessagesAttentionFromInbox,
    }),
    [
      messagesHasUnread,
      messagesUnreadTotal,
      notificationsUnread,
      refreshAttention,
      syncMessagesAttentionFromInbox,
    ]
  );

  return (
    <ParentAttentionContext.Provider value={value}>
      {children}
    </ParentAttentionContext.Provider>
  );
}

export function useParentAttention(): ParentAttentionValue {
  return useContext(ParentAttentionContext);
}
