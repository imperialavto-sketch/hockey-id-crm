import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';

export default function ConversationLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontSize: theme.typography.title.fontSize,
          fontWeight: theme.typography.title.fontWeight,
          color: theme.colors.text,
        },
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Диалог',
          headerBackTitle: 'Назад',
        }}
      />
    </Stack>
  );
}
