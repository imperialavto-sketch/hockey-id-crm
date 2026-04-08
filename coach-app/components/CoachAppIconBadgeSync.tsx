/**
 * Синхронизация числа на иконке с непрочитанными диалогами (после открытия приложения / resume).
 */

import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { getCoachChatUnreadBadgeCount } from '@/services/coachMessagesService';

type Props = { enabled: boolean };

export function CoachAppIconBadgeSync({ enabled }: Props) {
  const appState = useRef(AppState.currentState);

  const sync = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const Notifications = await import('expo-notifications');
    if (!enabled) {
      await Notifications.setBadgeCountAsync(0);
      return;
    }
    const n = await getCoachChatUnreadBadgeCount();
    await Notifications.setBadgeCountAsync(n);
  }, [enabled]);

  useEffect(() => {
    void sync();
  }, [sync]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        void sync();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [sync]);

  return null;
}
