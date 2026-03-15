import { Stack } from "expo-router";

export default function MarketplaceLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: "transparent" },
        headerStyle: { backgroundColor: "transparent" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "600" },
        headerBackTitle: "Назад",
      }}
    >
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="coaches"
        options={{ title: "Тренеры", headerShown: false }}
      />
      <Stack.Screen
        name="packages"
        options={{ title: "Пакеты", headerShown: false }}
      />
      <Stack.Screen
        name="coach/[id]"
        options={{ title: "Тренер", headerShown: false }}
      />
      <Stack.Screen
        name="booking-success"
        options={{ title: "Успешно", headerShown: false }}
      />
    </Stack>
  );
}
