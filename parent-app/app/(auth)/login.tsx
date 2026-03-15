import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Link, Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { PrimaryButton } from "@/components/ui";
import { colors, spacing, radii } from "@/constants/theme";
import { loginRequest } from "@/services/authService";

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (authLoading) {
    return (
      <View style={styles.loading}>
        <SafeAreaView style={styles.loadingSafe} edges={["top", "bottom"]} />
      </View>
    );
  }
  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Введите email и пароль");
      return;
    }
    setLoading(true);
    try {
      const res = await loginRequest(email.trim(), password);
      await login(res.token, res.parent);
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboard}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Вход</Text>
            <Text style={styles.subtitle}>Войдите как родитель хоккеиста</Text>

            <TextInput
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
              style={[styles.input, error ? styles.inputError : null]}
            />
            <TextInput
              placeholder="Пароль"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError("");
              }}
              secureTextEntry
              autoComplete="password"
              editable={!loading}
              style={[styles.input, error ? styles.inputError : null]}
            />

            <PrimaryButton
              label={loading ? "Вход…" : "Войти"}
              onPress={handleLogin}
              disabled={loading || !email.trim() || !password}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Link href="/(auth)/register" asChild>
              <Pressable style={styles.linkWrap}>
                <Text style={styles.link}>Нет аккаунта? Зарегистрироваться</Text>
              </Pressable>
            </Link>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1 },
  loadingSafe: { flex: 1 },
  safe: { flex: 1 },
  keyboard: { flex: 1, justifyContent: "center", padding: spacing[24] },
  content: { gap: spacing[16] },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing[8],
  },
  input: {
    backgroundColor: "rgba(10,20,40,0.65)",
    borderRadius: radii.md,
    padding: spacing[16],
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  inputError: { borderColor: colors.error },
  error: {
    fontSize: 14,
    color: colors.error,
    marginTop: 4,
  },
  linkWrap: { marginTop: spacing[8], alignSelf: "center" },
  link: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "500",
  },
});
