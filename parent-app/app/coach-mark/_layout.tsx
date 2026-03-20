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
      <Stack.Screen
        name="index"
        options={{ title: "Coach Mark", headerShown: true }}
      />
    </Stack>
  );
}
