import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';

export default function MarketplaceAvailabilityLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Назад',
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          color: theme.colors.text,
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Слоты маркетплейса' }}
      />
      <Stack.Screen
        name="new"
        options={{ title: 'Новый слот' }}
      />
      <Stack.Screen
        name="[id]"
        options={{ title: 'Редактирование слота' }}
      />
    </Stack>
  );
}
