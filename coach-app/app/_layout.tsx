import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '@/context/AuthContext';
import { theme } from '@/constants/theme';

// Hockey theme for navigation (dark premium)
const HockeyTheme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    primary: theme.colors.primary,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
  },
};

SplashScreen.preventAutoHideAsync();

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider value={HockeyTheme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="player" options={{ headerShown: false }} />
          <Stack.Screen name="team" options={{ headerShown: false }} />
          <Stack.Screen name="conversation" options={{ headerShown: false }} />
          <Stack.Screen name="attendance" options={{ headerShown: false }} />
          <Stack.Screen name="notes" options={{ headerShown: false }} />
          <Stack.Screen name="schedule" options={{ headerShown: false }} />
          <Stack.Screen name="dev" options={{ headerShown: false }} />
          <Stack.Screen
            name="actions"
            options={{
              headerShown: true,
              title: "Требуют внимания",
              headerBackTitle: "Назад",
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.text,
              headerTitleStyle: {
                color: theme.colors.text,
                fontWeight: "600",
              },
            }}
          />
          <Stack.Screen
            name="parent-drafts"
            options={{
              headerShown: true,
              title: "Черновики родителям",
              headerBackTitle: "Назад",
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.text,
              headerTitleStyle: {
                color: theme.colors.text,
                fontWeight: "600",
              },
            }}
          />
          <Stack.Screen
            name="session-review"
            options={{
              headerShown: true,
              title: "Итоги тренировки",
              headerBackTitle: "Назад",
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.text,
              headerTitleStyle: {
                color: theme.colors.text,
                fontWeight: "600",
              },
            }}
          />
          <Stack.Screen
            name="reports"
            options={{
              headerShown: true,
              title: "Отчёты недели",
              headerBackTitle: "Назад",
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.text,
              headerTitleStyle: {
                color: theme.colors.text,
                fontWeight: "600",
              },
            }}
          />
          <Stack.Screen
            name="created-reports"
            options={{
              headerShown: true,
              title: "Созданные отчёты",
              headerBackTitle: "Назад",
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.text,
              headerTitleStyle: {
                color: theme.colors.text,
                fontWeight: "600",
              },
            }}
          />
          <Stack.Screen
            name="created-reports/[id]"
            options={{
              headerShown: true,
              title: "Отчёт",
              headerBackTitle: "Назад",
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.text,
              headerTitleStyle: {
                color: theme.colors.text,
                fontWeight: "600",
              },
            }}
          />
          <Stack.Screen
            name="created-actions"
            options={{
              headerShown: true,
              title: "Созданные задачи",
              headerBackTitle: "Назад",
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.text,
              headerTitleStyle: {
                color: theme.colors.text,
                fontWeight: "600",
              },
            }}
          />
          <Stack.Screen
            name="created-actions/[id]"
            options={{
              headerShown: true,
              title: "Задача",
              headerBackTitle: "Назад",
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.text,
              headerTitleStyle: {
                color: theme.colors.text,
                fontWeight: "600",
              },
            }}
          />
          <Stack.Screen
            name="created"
            options={{
              headerShown: true,
              title: "Мои материалы",
              headerBackTitle: "Назад",
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.text,
              headerTitleStyle: {
                color: theme.colors.text,
                fontWeight: "600",
              },
            }}
          />
          <Stack.Screen
            name="voice-note"
            options={{
              headerShown: true,
              title: "Голосовая заметка",
              headerBackTitle: "Назад",
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.text,
              headerTitleStyle: {
                color: theme.colors.text,
                fontWeight: "600",
              },
            }}
          />
          <Stack.Screen
            name="voice-notes"
            options={{
              headerShown: true,
              title: "История голосовых заметок",
              headerBackTitle: "Назад",
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.text,
              headerTitleStyle: {
                color: theme.colors.text,
                fontWeight: "600",
              },
            }}
          />
          <Stack.Screen
            name="voice-notes/[id]"
            options={{
              headerShown: true,
              title: "Голосовая заметка",
              headerBackTitle: "Назад",
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.text,
              headerTitleStyle: {
                color: theme.colors.text,
                fontWeight: "600",
              },
            }}
          />
          <Stack.Screen
            name="voice-starter/action-item"
            options={{
              headerShown: true,
              title: "Задача из голоса",
              headerBackTitle: "Назад",
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.text,
              headerTitleStyle: {
                color: theme.colors.text,
                fontWeight: "600",
              },
            }}
          />
          <Stack.Screen
            name="voice-starter/report-draft"
            options={{
              headerShown: true,
              title: "Черновик отчёта",
              headerBackTitle: "Назад",
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.text,
              headerTitleStyle: {
                color: theme.colors.text,
                fontWeight: "600",
              },
            }}
          />
          <Stack.Screen
            name="unavailable"
            options={{
              headerShown: true,
              title: '',
              headerBackTitle: 'Назад',
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.text,
              headerTitleStyle: { color: theme.colors.text, fontWeight: '600' },
            }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
