import { useState, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { PrimaryButton, Input } from "@/components/ui";
import { colors, spacing, inputStyles, typography, feedback } from "@/constants/theme";
import { triggerHaptic } from "@/lib/haptics";
import { ApiRequestError } from "@/lib/api";
import { registerRequest } from "@/services/authService";

export default function RegisterScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = useCallback(async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Введите email и пароль");
      return;
    }
    setLoading(true);
    try {
      const res = await registerRequest(email.trim(), password);
      await login(res.token, res.parent);
      router.replace("/(tabs)");
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === "REGISTER_DISABLED") {
        setError(
          `${e.message}\n\nИспользуйте вход по номеру телефона на экране «Войти».`
        );
      } else {
        setError(e instanceof Error ? e.message : "Ошибка регистрации");
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, login, router]);

  if (authLoading) {
    return (
      <View style={styles.loading}>
        <SafeAreaView style={styles.loadingSafe} edges={["top", "bottom"]}>
          <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
        </SafeAreaView>
      </View>
    );
  }
  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboard}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Регистрация</Text>
            <Text style={styles.subtitle}>Создайте аккаунт родителя</Text>

            <Input
              placeholder="Email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
              error={!!error}
            />
            <Input
              placeholder="Пароль"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError("");
              }}
              secureTextEntry
              autoComplete="password"
              editable={!loading}
              error={!!error}
            />

            <PrimaryButton
              label={loading ? "Регистрация…" : "Зарегистрироваться"}
              onPress={handleRegister}
              disabled={loading || !email.trim() || !password}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [styles.linkWrap, pressed && { opacity: feedback.pressedOpacity }]}
              onPress={() => {
                triggerHaptic();
                router.push("/(auth)/login");
              }}
            >
              <Text style={styles.link}>Уже есть аккаунт? Войти</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1 },
  loadingSafe: { flex: 1, justifyContent: "center", alignItems: "center" },
  loader: { marginTop: spacing.xl },
  safe: { flex: 1 },
  keyboard: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xxl,
    gap: inputStyles.formFieldGap,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  error: {
    ...typography.captionSmall,
    color: colors.error,
    marginTop: spacing.xs,
  },
  linkWrap: { marginTop: spacing.xl, alignSelf: "center" },
  link: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "600",
  },
});
