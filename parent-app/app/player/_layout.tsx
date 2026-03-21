import { Stack } from "expo-router";

export default function PlayerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        contentStyle: { backgroundColor: "transparent" },
        headerStyle: { backgroundColor: "transparent" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { color: "#ffffff", fontSize: 18, fontWeight: "600" },
        headerBackTitle: "Назад",
      }}
    >
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="add"
        options={{
          title: "Добавить игрока",
          headerShown: true,
        }}
      />
    </Stack>
  );
}
