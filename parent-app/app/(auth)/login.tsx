import { useState, useCallback, useRef, useEffect } from "react";
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

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, requestCode, verifyCode } = useAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const handleRequestCode = useCallback(async () => {
    const trimmedPhone = phone.trim();
    if (mountedRef.current) setError("");
    if (!trimmedPhone) {
      if (mountedRef.current) setError("Введите номер телефона");
      return;
    }
    if (mountedRef.current) setLoading(true);
    try {
      await requestCode(trimmedPhone);
      if (mountedRef.current) setStep("code");
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : "Ошибка входа");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [phone, requestCode]);

  const handleVerifyCode = useCallback(async () => {
    const trimmedPhone = phone.trim();
    const trimmedCode = code.trim();
    if (mountedRef.current) setError("");
    if (!trimmedPhone) {
      if (mountedRef.current) setError("Введите номер телефона");
      return;
    }
    if (!trimmedCode) {
      if (mountedRef.current) setError("Введите код подтверждения");
      return;
    }
    if (mountedRef.current) setLoading(true);
    try {
      await verifyCode(trimmedPhone, trimmedCode);
      if (mountedRef.current) router.replace("/(tabs)");
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : "Ошибка входа");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [phone, code, verifyCode, router]);

  const handleBackToPhone = useCallback(() => {
    if (loading) return;
    triggerHaptic();
    setCode("");
    setError("");
    setStep("phone");
  }, [loading]);

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
            <Text style={styles.title}>Вход</Text>
            <Text style={styles.subtitle}>Войдите как родитель хоккеиста</Text>

            <Input
              placeholder="Номер телефона"
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                setError("");
              }}
              keyboardType="phone-pad"
              autoCapitalize="none"
              editable={!loading}
              error={!!error}
            />

            {step === "code" && (
              <Input
                placeholder="Код подтверждения"
                value={code}
                onChangeText={(t) => {
                  setCode(t);
                  setError("");
                }}
                keyboardType="number-pad"
                autoCapitalize="none"
                editable={!loading}
                error={!!error}
              />
            )}

            <PrimaryButton
              label={
                loading
                  ? step === "phone"
                    ? "Отправка…"
                    : "Вход…"
                  : step === "phone"
                    ? "Получить код"
                    : "Подтвердить"
              }
              onPress={step === "phone" ? handleRequestCode : handleVerifyCode}
              disabled={
                loading ||
                !phone.trim() ||
                (step === "code" && !code.trim())
              }
            />

            {step === "code" && (
              <View style={styles.linkRow}>
                <Pressable
                  onPress={handleBackToPhone}
                  disabled={loading}
                  style={({ pressed }) => pressed && { opacity: feedback.pressedOpacity }}
                >
                  <Text style={styles.linkSecondary}>Изменить номер</Text>
                </Pressable>

                <Pressable
                  onPress={handleRequestCode}
                  disabled={loading || !phone.trim()}
                  style={({ pressed }) => pressed && { opacity: feedback.pressedOpacity }}
                >
                  <Text style={styles.linkSecondary}>Отправить код ещё раз</Text>
                </Pressable>
              </View>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [styles.linkWrap, pressed && { opacity: feedback.pressedOpacity }]}
              onPress={() => {
                triggerHaptic();
                router.push("/(auth)/register");
              }}
            >
              <Text style={styles.link}>Нет аккаунта? Регистрация</Text>
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
  linkRow: {
    marginTop: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  linkSecondary: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});
