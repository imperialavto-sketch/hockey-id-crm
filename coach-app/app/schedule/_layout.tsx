import { Stack } from "expo-router";
import { theme } from "@/constants/theme";

export default function ScheduleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Назад",
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          color: theme.colors.text,
          fontWeight: "600",
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Расписание" }} />
      <Stack.Screen name="create" options={{ title: "Новая тренировка" }} />
    </Stack>
  );
}
