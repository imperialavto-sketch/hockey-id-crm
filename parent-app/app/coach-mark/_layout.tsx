import { Stack } from "expo-router";

export default function CoachMarkLayout() {
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
      {/* Заголовок в UI — «Арена»; сегмент маршрута coach-mark без изменений (technical). */}
      <Stack.Screen
        name="index"
        options={{ title: "Арена", headerShown: true }}
      />
    </Stack>
  );
}
