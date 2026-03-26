import { Stack } from "expo-router";

export default function PlayerIdLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
        headerStyle: { backgroundColor: "transparent" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { color: "#ffffff", fontSize: 18, fontWeight: "600" },
        headerBackTitle: "Назад",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Профиль игрока" }} />
      <Stack.Screen
        name="development"
        options={{ title: "Путь развития", headerShown: false }}
      />
      <Stack.Screen
        name="ai-report"
        options={{ title: "Отчёт AI-тренера", headerShown: false }}
      />
      <Stack.Screen
        name="development-plan"
        options={{ title: "План развития", headerShown: false }}
      />
      <Stack.Screen
        name="video-analysis"
        options={{ title: "AI видео-анализ", headerShown: false }}
      />
      <Stack.Screen
        name="coach-materials"
        options={{ title: "Материалы тренера", headerShown: false }}
      />
      <Stack.Screen
        name="passport"
        options={{ title: "Паспорт игрока", headerShown: false }}
      />
      <Stack.Screen
        name="achievements"
        options={{ title: "Достижения", headerShown: false }}
      />
    </Stack>
  );
}
