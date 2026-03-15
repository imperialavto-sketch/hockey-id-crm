import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function SubscriptionLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="membership" />
      <Stack.Screen name="success" />
    </Stack>
  );
}
