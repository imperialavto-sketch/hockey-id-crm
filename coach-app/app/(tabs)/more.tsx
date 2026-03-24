import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { HeroTitle } from '@/components/ui/HeroTitle';
import { useAuth } from '@/context/AuthContext';
import { theme } from '@/constants/theme';

const MENU_ITEMS: Array<{
  label: string;
  ios: string;
  android: string;
  isDestructive?: boolean;
  action?: 'logout';
  route?: string;
  module?: string;
}> = [
  { label: 'Расписание', ios: 'calendar', android: 'event', route: '/schedule' },
  { label: 'Запись сессии', ios: 'plus.circle.fill', android: 'add_circle', route: '/dev/coach-input' },
  { label: 'Настройки', ios: 'gearshape.fill', android: 'settings', route: '/unavailable', module: 'settings' },
  { label: 'Уведомления', ios: 'bell.fill', android: 'notifications', route: '/unavailable', module: 'notifications' },
  { label: 'Поддержка', ios: 'questionmark.circle.fill', android: 'help', route: '/unavailable', module: 'support' },
  { label: 'Выйти', ios: 'rectangle.portrait.and.arrow.right', android: 'logout', isDestructive: true, action: 'logout' },
];

export default function MoreScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  const handlePress = async (item: (typeof MENU_ITEMS)[number]) => {
    if (item.route) {
      router.push(
        item.module
          ? { pathname: item.route, params: { module: item.module } }
          : (item.route as Href)
      );
      return;
    }
    if (item.action === 'logout') {
      await logout();
      router.replace('/(auth)/login');
    }
  };

  return (
    <ScreenContainer>
      <HeroTitle title="Ещё" />

      <SectionCard>
        {MENU_ITEMS.map((item, index) => (
          <Pressable
            key={item.label}
            onPress={() => handlePress(item)}
            style={({ pressed }) => [
              styles.menuItem,
              index > 0 && styles.menuItemBorder,
              pressed && styles.menuItemPressed,
            ]}
          >
            <SymbolView
              name={
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                { ios: item.ios, android: item.android, web: item.android } as any
              }
              tintColor={item.isDestructive ? theme.colors.error : theme.colors.textSecondary}
              size={22}
            />
            <Text
              style={[
                styles.menuLabel,
                item.isDestructive && styles.menuLabelDestructive,
              ]}
            >
              {item.label}
            </Text>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={theme.colors.textMuted}
              size={16}
            />
          </Pressable>
        ))}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  menuItemBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  menuLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
  },
  menuLabelDestructive: {
    color: theme.colors.error,
  },
});
