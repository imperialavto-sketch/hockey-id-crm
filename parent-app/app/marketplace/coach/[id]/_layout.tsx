import { Stack } from "expo-router";

export default function CoachIdLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="booking" />
      <Stack.Screen name="checkout" />
    </Stack>
  );
}
