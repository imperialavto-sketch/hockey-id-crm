import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function TeamLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="feed" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="members" />
      <Stack.Screen name="create-post" />
      <Stack.Screen name="announcement/[id]" />
    </Stack>
  );
}
