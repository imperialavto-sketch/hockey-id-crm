/**
 * Placeholder screen for modules/features not yet available.
 * Route: /unavailable?module=settings|notifications|support|...
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { theme } from '@/constants/theme';

const MODULE_LABELS: Record<string, { title: string; subtitle: string }> = {
  settings: {
    title: 'Настройки',
    subtitle: 'Модуль настроек пока не подключён. Когда будет готов, здесь можно будет настроить профиль и предпочтения.',
  },
  notifications: {
    title: 'Уведомления',
    subtitle: 'Модуль уведомлений пока не подключён. Когда будет готов, здесь можно будет управлять оповещениями.',
  },
  support: {
    title: 'Поддержка',
    subtitle: 'Модуль поддержки пока не подключён. Когда будет готов, здесь можно будет связаться с командой.',
  },
  'new-message': {
    title: 'Новое сообщение',
    subtitle: 'Функция создания диалогов пока недоступна.',
  },
  'write-parent': {
    title: 'Написать родителю',
    subtitle: 'Функция связи с родителями пока недоступна.',
  },
  progress: {
    title: 'Прогресс',
    subtitle: 'Модуль прогресса игрока пока не подключён.',
  },
  roster: {
    title: 'Управление ростером',
    subtitle: 'Модуль управления составом пока не подключён.',
  },
  'write-team': {
    title: 'Написать команде',
    subtitle: 'Функция сообщений команде пока недоступна.',
  },
};

const DEFAULT = {
  title: 'Модуль пока недоступен',
  subtitle: 'Эта функция ещё не подключена.',
};

export default function UnavailableScreen() {
  const { module } = useLocalSearchParams<{ module?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const config = (module && MODULE_LABELS[module]) || DEFAULT;

  useEffect(() => {
    navigation.setOptions({ title: config.title });
  }, [navigation, config.title]);

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>🔧</Text>
        </View>
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.subtitle}>{config.subtitle}</Text>
        <PrimaryButton
          title="Назад"
          variant="outline"
          onPress={() => router.back()}
          style={styles.backBtn}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    maxWidth: 320,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  backBtn: {
    alignSelf: 'stretch',
  },
});
