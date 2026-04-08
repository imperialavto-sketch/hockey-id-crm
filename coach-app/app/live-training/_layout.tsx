/**
 * PHASE 3: `COACH_CANONICAL_LIVE_FLOW` — stack under `live-training/*` uses `liveTrainingService` + `/api/live-training/*`.
 */
import { Stack } from "expo-router";
import { coachStackContentStyle, theme } from "@/constants/theme";

const header = {
  contentStyle: coachStackContentStyle,
  headerStyle: { backgroundColor: theme.colors.background },
  headerTintColor: theme.colors.text,
  headerTitleStyle: {
    color: theme.colors.text,
    fontWeight: "600" as const,
  },
  headerBackTitle: "Назад",
};

export default function LiveTrainingLayout() {
  return (
    <Stack screenOptions={{ ...header, headerShown: true }}>
      <Stack.Screen name="start" options={{ title: "Живая тренировка" }} />
      <Stack.Screen name="[sessionId]/live" options={{ title: "Тренировка" }} />
      <Stack.Screen name="[sessionId]/review" options={{ title: "Проверка наблюдений" }} />
      <Stack.Screen name="[sessionId]/complete" options={{ title: "Готово", headerBackVisible: false }} />
      <Stack.Screen name="[sessionId]/report-draft" options={{ title: "Черновик отчёта" }} />
    </Stack>
  );
}
