import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="billing" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
