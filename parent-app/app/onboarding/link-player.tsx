import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { PrimaryButton, Input } from "@/components/ui";
import { colors, spacing, typography, inputStyles, feedback } from "@/constants/theme";
import { triggerHaptic } from "@/lib/haptics";
import {
  hasLinkedPlayers,
  markPostLinkSuccess,
  refreshPendingParentLinks,
  type RefreshPendingLinksResult,
} from "@/services/parentOnboardingService";
import { isDemoMode } from "@/config/api";
import {
  linkByInviteCode,
  ParentInviteLinkError,
} from "@/services/parentInviteLinkService";

type Phase = "phone" | "code" | "noInvite";

export default function LinkPlayerOnboardingScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user, requestCode, verifyCode, logout } = useAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [phase, setPhase] = useState<Phase>("phone");
  const [loading, setLoading] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [inviteLinkBusy, setInviteLinkBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [error, setError] = useState("");
  const [noInviteHint, setNoInviteHint] = useState("");
  const [inviteLinkError, setInviteLinkError] = useState("");
  const mountedRef = useRef(true);
  const maskedPhone = maskPhoneForHint(phone);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  useEffect(() => {
    if (user?.phone) {
      setPhone((prev) => (prev === "" ? user.phone! : prev));
    }
  }, [user?.phone]);

  const goTabsIfLinked = useCallback(async (): Promise<boolean> => {
    const linked = await hasLinkedPlayers();
    if (!mountedRef.current) return linked;
    if (linked) {
      await markPostLinkSuccess();
      router.replace("/(tabs)");
    } else {
      setPhase("noInvite");
      setCode("");
      setError("");
    }
    return linked;
  }, [router]);

  const handleRequestCode = useCallback(async () => {
    const trimmed = phone.trim();
    if (mountedRef.current) setError("");
    if (!trimmed) {
      if (mountedRef.current) setError("Введите номер телефона");
      return;
    }
    if (mountedRef.current) setLoading(true);
    try {
      await requestCode(trimmed);
      if (mountedRef.current) setPhase("code");
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : "Не удалось отправить код");
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
      await goTabsIfLinked();
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : "Не удалось подтвердить");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [phone, code, verifyCode, goTabsIfLinked]);

  const handleBackToPhone = useCallback(() => {
    if (loading) return;
    triggerHaptic();
    setCode("");
    setError("");
    setPhase("phone");
  }, [loading]);

  const handleTryAgainSms = useCallback(() => {
    triggerHaptic();
    setError("");
    setNoInviteHint("");
    setInviteLinkError("");
    setCode("");
    setPhase("phone");
  }, []);

  const handleCheckAgain = useCallback(async () => {
    triggerHaptic();
    if (refreshBusy || inviteLinkBusy || logoutBusy) return;
    setRefreshBusy(true);
    setNoInviteHint("");
    setInviteLinkError("");
    try {
      let refreshResult: RefreshPendingLinksResult | null = null;
      if (!isDemoMode) {
        try {
          refreshResult = await refreshPendingParentLinks();
        } catch {
          if (mountedRef.current) {
            setNoInviteHint("Не удалось связаться с сервером. Проверьте интернет и попробуйте снова.");
          }
          return;
        }
      }

      const linked = await hasLinkedPlayers();
      if (!mountedRef.current) return;
      if (linked) {
        await markPostLinkSuccess();
        router.replace("/(tabs)");
      } else {
        const fromServer = refreshResult?.message?.trim();
        setNoInviteHint(
          fromServer
            ? `${fromServer} Если ребёнок всё ещё не отображается, подождите минуту и нажмите «Проверить снова», запросите SMS-код или введите код от тренера.`
            : "Пока детей в аккаунте нет. Если тренер только что добавил ваш номер, нажмите «Проверить снова» ещё раз через минуту — или запросите SMS-код / введите код от тренера."
        );
      }
    } catch {
      if (mountedRef.current) {
        setNoInviteHint("Не удалось проверить список детей. Попробуйте снова.");
      }
    } finally {
      if (mountedRef.current) setRefreshBusy(false);
    }
  }, [refreshBusy, inviteLinkBusy, logoutBusy, router]);

  const handleLinkByInvite = useCallback(async () => {
    const trimmed = inviteCodeInput.trim();
    if (mountedRef.current) {
      setInviteLinkError("");
      setNoInviteHint("");
    }
    if (!trimmed) {
      if (mountedRef.current) setInviteLinkError("Введите код приглашения");
      return;
    }
    if (mountedRef.current) setInviteLinkBusy(true);
    try {
      await linkByInviteCode(trimmed);
      const linked = await hasLinkedPlayers();
      if (!mountedRef.current) return;
      if (linked) {
        await markPostLinkSuccess();
        router.replace("/(tabs)");
      } else {
        setInviteLinkError("Связь создана, но список не обновился. Нажмите «Проверить снова».");
      }
    } catch (e) {
      if (mountedRef.current) {
        if (e instanceof ParentInviteLinkError) {
          setInviteLinkError(e.message);
        } else {
          setInviteLinkError(
            e instanceof Error ? e.message : "Не удалось подключить. Попробуйте позже."
          );
        }
      }
    } finally {
      if (mountedRef.current) setInviteLinkBusy(false);
    }
  }, [inviteCodeInput, router]);

  const handleLogout = useCallback(async () => {
    if (loading || logoutBusy || refreshBusy || inviteLinkBusy) return;
    setLogoutBusy(true);
    try {
      await logout();
      if (mountedRef.current) router.replace("/(auth)/login");
    } finally {
      if (mountedRef.current) setLogoutBusy(false);
    }
  }, [loading, logout, logoutBusy, refreshBusy, inviteLinkBusy, router]);

  if (authLoading) {
    return <Redirect href="/" />;
  }
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboard}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {phase === "noInvite" ? (
              <>
                <Text style={styles.title}>Подключение ребёнка</Text>
                <Text style={styles.helperCenter}>
                  Обычно всё проходит так:{"\n\n"}
                  1. Тренер добавляет ваш номер телефона к карточке игрока в системе.{"\n\n"}
                  2. Вы входите в приложение с тем же номером и подтверждаете его кодом из SMS.{"\n\n"}
                  3. После подтверждения ребёнок появляется в приложении автоматически.
                </Text>

                <PrimaryButton
                  label={refreshBusy ? "Проверяем…" : "Проверить снова"}
                  onPress={handleCheckAgain}
                  disabled={refreshBusy || inviteLinkBusy || logoutBusy}
                />

                {noInviteHint ? <Text style={styles.hintMuted}>{noInviteHint}</Text> : null}

                <Pressable
                  onPress={handleTryAgainSms}
                  disabled={refreshBusy || inviteLinkBusy || logoutBusy}
                  style={({ pressed }) => [styles.secondaryWrap, pressed && { opacity: feedback.pressedOpacity }]}
                >
                  <Text style={styles.linkSecondary}>Запросить SMS-код снова</Text>
                </Pressable>

                <View style={styles.dividerBlock}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerLabel}>или</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Text style={styles.manualTitle}>Код от тренера</Text>
                <Text style={styles.manualHelper}>
                  Если тренер передал код приглашения (из CRM), введите его здесь — это запасной способ, не заменяет
                  подтверждение номера.
                </Text>
                <Input
                  placeholder="Код приглашения"
                  value={inviteCodeInput}
                  onChangeText={(t) => {
                    setInviteCodeInput(t);
                    setInviteLinkError("");
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!inviteLinkBusy && !refreshBusy}
                  error={!!inviteLinkError}
                />
                <PrimaryButton
                  label={inviteLinkBusy ? "Подключаем…" : "Подключить по коду"}
                  onPress={handleLinkByInvite}
                  disabled={
                    inviteLinkBusy ||
                    refreshBusy ||
                    logoutBusy ||
                    !inviteCodeInput.trim()
                  }
                />
                {inviteLinkError ? <Text style={styles.error}>{inviteLinkError}</Text> : null}

                <Pressable
                  onPress={handleLogout}
                  disabled={refreshBusy || inviteLinkBusy || logoutBusy}
                  style={({ pressed }) => [styles.secondaryWrap, pressed && { opacity: feedback.pressedOpacity }]}
                >
                  <Text style={styles.linkSecondary}>{logoutBusy ? "Выходим…" : "Выйти"}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.title}>Введите номер телефона</Text>
                <Text style={styles.subtitle}>
                  Тот же номер, который тренер указал в приглашении. После SMS-кода ребёнок подключится сам, если
                  приглашение уже в системе.
                </Text>

                <Input
                  placeholder="Номер телефона"
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    setError("");
                  }}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  editable={!loading && phase === "phone"}
                  error={!!error && phase === "phone"}
                />

                {phase === "code" && (
                  <>
                    <Text style={styles.stepMeta}>Код из SMS</Text>
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
                      error={!!error && phase === "code"}
                    />
                    <Text style={styles.codeHint}>
                      Код отправили на {maskedPhone}. Он может прийти в SMS или через звонок.
                    </Text>
                  </>
                )}

                <PrimaryButton
                  label={
                    loading
                      ? phase === "phone"
                        ? "Отправка…"
                        : "Проверяем…"
                      : phase === "phone"
                        ? "Получить код"
                        : "Подтвердить"
                  }
                  onPress={phase === "phone" ? handleRequestCode : handleVerifyCode}
                  disabled={
                    loading ||
                    !phone.trim() ||
                    (phase === "code" && !code.trim())
                  }
                />

                {phase === "code" && (
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

                {phase === "phone" ? (
                  <Text style={styles.helper}>
                    Мы отправим код в SMS или через звонок. Номер должен совпадать с тем, что тренер добавил к игроку.
                  </Text>
                ) : (
                  <Text style={styles.helper}>
                    Если код не пришёл сразу, подождите немного и отправьте его ещё раз.
                  </Text>
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  keyboard: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xxl,
    gap: inputStyles.formFieldGap,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  stepMeta: {
    ...typography.captionSmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  codeHint: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  error: {
    ...typography.captionSmall,
    color: colors.error,
    marginTop: spacing.xs,
  },
  hintMuted: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  helper: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  helperCenter: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "left",
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  manualTitle: {
    ...typography.captionSmall,
    color: colors.textMuted,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  manualHelper: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  dividerBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.surfaceLevel1Border,
  },
  dividerLabel: {
    ...typography.captionSmall,
    color: colors.textMuted,
  },
  linkRow: {
    marginTop: spacing.lg,
    flexDirection: "column",
    alignItems: "center",
    gap: spacing.sm,
  },
  linkSecondary: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  secondaryWrap: {
    alignItems: "center",
    marginTop: spacing.md,
  },
});

function maskPhoneForHint(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return "ваш номер";
  return `+${digits.slice(0, 4)}***${digits.slice(-4)}`;
}
