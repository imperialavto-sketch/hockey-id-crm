import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function VideoAnalysisLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="upload" />
      <Stack.Screen name="[analysisId]" />
      <Stack.Screen name="success" />
    </Stack>
  );
}
