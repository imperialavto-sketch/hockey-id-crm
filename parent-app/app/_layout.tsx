import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/context/AuthContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import AppBackground from "@/components/AppBackground";

function RootLayoutNav() {
  useEffect(() => {
    if (__DEV__) console.timeEnd("[Startup] RootLayout render");
  }, []);

  return (
    <AppBackground>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="player" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="feed" options={{ headerShown: false }} />
        <Stack.Screen name="marketplace" options={{ headerShown: false }} />
        <Stack.Screen name="bookings" options={{ headerShown: false }} />
        <Stack.Screen name="subscription" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="team" options={{ headerShown: false }} />
        <Stack.Screen name="coach-mark" options={{ headerShown: false }} />
      </Stack>
    </AppBackground>
  );
}

export default function RootLayout() {
  if (__DEV__) {
    console.time("[Startup] RootLayout render");
    console.time("[Startup] AuthProvider init");
  }

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <AuthInitMarker />
        <RootLayoutNav />
      </SubscriptionProvider>
    </AuthProvider>
  );
}

function AuthInitMarker() {
  useEffect(() => {
    if (__DEV__) console.timeEnd("[Startup] AuthProvider init");
  }, []);
  return null;
}

