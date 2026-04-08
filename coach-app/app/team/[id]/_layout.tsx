import { Stack } from 'expo-router';
import { coachStackContentStyle, theme } from '@/constants/theme';

export default function TeamIdLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        contentStyle: coachStackContentStyle,
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontSize: theme.typography.title.fontSize,
          fontWeight: theme.typography.title.fontWeight,
          color: theme.colors.text,
        },
        headerBackTitle: 'Назад',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Команда' }} />
      <Stack.Screen name="group/[groupId]" options={{ title: 'Группа' }} />
    </Stack>
  );
}
