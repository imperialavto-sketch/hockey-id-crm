import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';

export default function PlayerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontSize: theme.typography.title.fontSize,
          fontWeight: theme.typography.title.fontWeight,
          color: theme.colors.text,
        },
      }}
    >
      <Stack.Screen name="[id]/index" options={{ title: 'Профиль игрока' }} />
      <Stack.Screen
        name="[id]/report"
        options={{ title: 'Отчёт по игроку' }}
      />
      <Stack.Screen
        name="[id]/share-report"
        options={{
          title: 'Сообщение родителю',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
