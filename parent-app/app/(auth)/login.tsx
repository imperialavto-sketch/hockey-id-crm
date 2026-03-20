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
import { useRouter, Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { PrimaryButton } from "@/components/ui";
import { colors, spacing, radii } from "@/constants/theme";
import { getApiBase } from "@/lib/api";

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, requestCode, verifyCode } = useAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugMessage, setDebugMessage] = useState("");

  if (authLoading) {
    return (
      <View style={styles.loading}>
        <SafeAreaView style={styles.loadingSafe} edges={["top", "bottom"]} />
      </View>
    );
  }
  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  const handleRequestCode = async () => {
    const trimmedPhone = phone.trim();
    setError("");
    if (__DEV__) {
      setDebugMessage(`request:start step=${step} api=${getApiBase()}`);
      console.log("[login] request-code submit", {
        step,
        phone: trimmedPhone,
        apiBase: getApiBase(),
      });
    }
    if (!trimmedPhone) {
      setError("Введите номер телефона");
      return;
    }
    setLoading(true);
    try {
      await requestCode(trimmedPhone);
      setStep("code");
      if (__DEV__) {
        setDebugMessage(`request:success step=code api=${getApiBase()}`);
        console.log("[login] request-code success", {
          previousStep: step,
          nextStep: "code",
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ошибка входа";
      if (__DEV__) {
        setDebugMessage(`request:error ${message}`);
        console.warn("[login] request-code error", { message, apiBase: getApiBase() });
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const trimmedPhone = phone.trim();
    const trimmedCode = code.trim();
    setError("");
    if (__DEV__) {
      setDebugMessage(`verify:click step=${step} api=${getApiBase()}`);
      console.log("VERIFY CLICK");
      console.log("VERIFY PHONE:", trimmedPhone);
      console.log("VERIFY CODE:", trimmedCode);
      console.log("VERIFY REQUEST URL:", `${getApiBase()}/api/parent/mobile/auth/verify`);
      console.log("VERIFY REQUEST METHOD:", "POST");
      console.log("VERIFY REQUEST BODY:", JSON.stringify({ phone: trimmedPhone, code: trimmedCode }));
    }
    if (!trimmedPhone) {
      setError("Введите номер телефона");
      return;
    }
    if (!trimmedCode) {
      setError("Введите код подтверждения");
      return;
    }
    setLoading(true);
    try {
      await verifyCode(trimmedPhone, trimmedCode);
      if (__DEV__) {
        setDebugMessage(`verify:success step=${step} api=${getApiBase()}`);
        console.log("VERIFY RESPONSE:", "success");
      }
      router.replace("/(tabs)");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ошибка входа";
      if (__DEV__) {
        setDebugMessage(`verify:error ${message}`);
        console.warn("VERIFY ERROR:", message);
      }
      setError(message);
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
              placeholder="Номер телефона"
              placeholderTextColor={colors.textMuted}
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                setError("");
              }}
              keyboardType="phone-pad"
              autoCapitalize="none"
              editable={!loading}
              style={[styles.input, error ? styles.inputError : null]}
            />

            {step === "code" && (
              <TextInput
                placeholder="Код подтверждения"
                placeholderTextColor={colors.textMuted}
                value={code}
                onChangeText={(t) => {
                  setCode(t);
                  setError("");
                }}
                keyboardType="number-pad"
                autoCapitalize="none"
                editable={!loading}
                style={[styles.input, error ? styles.inputError : null]}
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
                  onPress={() => {
                    setCode("");
                    setError("");
                    setStep("phone");
                  }}
                  disabled={loading}
                >
                  <Text style={styles.linkSecondary}>Изменить номер</Text>
                </Pressable>

                <Pressable
                  onPress={handleRequestCode}
                  disabled={loading || !phone.trim()}
                >
                  <Text style={styles.linkSecondary}>Отправить код ещё раз</Text>
                </Pressable>
              </View>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {__DEV__ ? <Text style={styles.debug}>{debugMessage || `api=${getApiBase()} step=${step}`}</Text> : null}
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
  debug: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  linkWrap: { marginTop: spacing[8], alignSelf: "center" },
  link: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "500",
  },
  linkRow: {
    marginTop: spacing[8],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[12],
  },
  linkSecondary: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});
