import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  SymbolViewMaterial,
  type MaterialIconName,
} from '@/components/SymbolViewMaterial';
import type { SFSymbol } from 'expo-symbols';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { HeroTitle } from '@/components/ui/HeroTitle';
import { useAuth } from '@/context/AuthContext';
import { theme } from '@/constants/theme';
import { LIVE_TRAINING_START_ROUTE } from '@/services/liveTrainingService';

const MENU_ITEMS: Array<{
  label: string;
  ios: SFSymbol;
  material: MaterialIconName;
  isDestructive?: boolean;
  action?: 'logout';
  route?: string;
  module?: string;
}> = [
  { label: 'Главная', ios: 'square.grid.2x2.fill', material: 'dashboard', route: '/(tabs)/home' },
  {
    label: 'Маркетплейс · брони',
    ios: 'calendar',
    material: 'event',
    route: '/marketplace-bookings',
  },
  {
    label: 'Маркетплейс · слоты',
    ios: 'calendar',
    material: 'event',
    route: '/marketplace-availability',
  },
  { label: 'Живая тренировка', ios: 'plus.circle.fill', material: 'add-circle', route: LIVE_TRAINING_START_ROUTE },
  { label: 'Мои материалы', ios: 'tray.full.fill', material: 'inventory-2', route: '/created' },
  /** ❗ UTILITY ONLY — NOT TRAINING SSOT: личная заметка без привязки к сессии / voice-draft */
  { label: 'Личная заметка (не тренировка)', ios: 'mic.fill', material: 'mic', route: '/voice-note' },
  { label: 'Настройки', ios: 'gearshape.fill', material: 'settings', route: '/unavailable', module: 'settings' },
  { label: 'Уведомления', ios: 'bell.fill', material: 'notifications', route: '/unavailable', module: 'notifications' },
  { label: 'Поддержка', ios: 'questionmark.circle.fill', material: 'help', route: '/unavailable', module: 'support' },
  { label: 'Выйти', ios: 'rectangle.portrait.and.arrow.right', material: 'logout', isDestructive: true, action: 'logout' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  const handlePress = async (item: (typeof MENU_ITEMS)[number]) => {
    if (item.route) {
      if (item.module) {
        router.push({
          pathname: item.route,
          params: { module: item.module },
        } as Href);
      } else {
        router.push(item.route as Href);
      }
      return;
    }
    if (item.action === 'logout') {
      await logout();
      router.replace('/(auth)/login');
    }
  };

  return (
    <ScreenContainer>
      <HeroTitle title="Профиль" />

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
            <SymbolViewMaterial
              sfName={item.ios}
              materialName={item.material}
              color={item.isDestructive ? theme.colors.error : theme.colors.textSecondary}
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
            <SymbolViewMaterial
              sfName="chevron.right"
              materialName="chevron-right"
              color={theme.colors.textMuted}
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
