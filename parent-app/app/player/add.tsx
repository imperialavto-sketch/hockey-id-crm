import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { createPlayerForParent } from "@/services/playerService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { Input, PrimaryButton, EmptyStateView } from "@/components/ui";
import { colors, spacing, typography, inputStyles } from "@/constants/theme";
import { triggerHaptic } from "@/lib/haptics";

export default function AddPlayerScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [position, setPosition] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");

  const currentYear = new Date().getFullYear();
  const minBirthYear = currentYear - 25;
  const maxBirthYear = currentYear - 4;

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = "Введите имя";
    if (!lastName.trim()) next.lastName = "Введите фамилию";
    const year = parseInt(birthYear, 10);
    if (!birthYear || Number.isNaN(year)) {
      next.birthYear = "Введите год рождения";
    } else if (year < minBirthYear || year > maxBirthYear) {
      next.birthYear = `Год от ${minBirthYear} до ${maxBirthYear}`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = useCallback(async () => {
    if (!user?.id) return;
    triggerHaptic();
    setSubmitError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      const year = parseInt(birthYear, 10);
      const player = await createPlayerForParent({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthYear: year,
        position: position.trim() || undefined,
      });
      router.replace(`/player/${player.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Не удалось добавить игрока");
    } finally {
      setSubmitting(false);
    }
  }, [user?.id, firstName, lastName, birthYear, position, router]);

  if (!user?.id) {
    return (
      <FlagshipScreen scroll={false}>
        <View style={styles.centered}>
          <EmptyStateView
            title="Требуется вход"
            subtitle="Войдите в аккаунт, чтобы добавить игрока"
            icon="person-outline"
            buttonLabel="Войти"
            onButtonPress={() => router.push("/(auth)/login")}
          />
        </View>
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Добавить игрока</Text>
          <Text style={styles.subtitle}>
            Заполните данные ребёнка для профиля
          </Text>

          <View style={styles.form}>
            <Input
              placeholder="Имя"
              value={firstName}
              onChangeText={(t) => {
                setFirstName(t);
                setErrors((e) => (e.firstName ? { ...e, firstName: "" } : e));
                setSubmitError("");
              }}
              autoCapitalize="words"
              autoCorrect={false}
              error={!!errors.firstName}
              editable={!submitting}
            />
            {errors.firstName ? (
              <Text style={styles.errorText}>{errors.firstName}</Text>
            ) : null}

            <Input
              placeholder="Фамилия"
              value={lastName}
              onChangeText={(t) => {
                setLastName(t);
                setErrors((e) => (e.lastName ? { ...e, lastName: "" } : e));
                setSubmitError("");
              }}
              autoCapitalize="words"
              autoCorrect={false}
              error={!!errors.lastName}
              editable={!submitting}
            />
            {errors.lastName ? (
              <Text style={styles.errorText}>{errors.lastName}</Text>
            ) : null}

            <Input
              placeholder={`Год рождения (${minBirthYear}–${maxBirthYear})`}
              value={birthYear}
              onChangeText={(t) => {
                setBirthYear(t);
                setErrors((e) => (e.birthYear ? { ...e, birthYear: "" } : e));
                setSubmitError("");
              }}
              keyboardType="number-pad"
              maxLength={4}
              error={!!errors.birthYear}
              editable={!submitting}
            />
            {errors.birthYear ? (
              <Text style={styles.errorText}>{errors.birthYear}</Text>
            ) : null}

            <Input
              placeholder="Позиция (необязательно)"
              value={position}
              onChangeText={(t) => {
                setPosition(t);
                setSubmitError("");
              }}
              editable={!submitting}
            />
          </View>

          <PrimaryButton
            label={submitting ? "Добавление…" : "Добавить игрока"}
            onPress={handleSubmit}
            disabled={submitting}
          />

          {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  scroll: {
    padding: spacing.screenPadding,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  form: {
    gap: inputStyles.formFieldGap,
    marginBottom: spacing.xl,
  },
  errorText: {
    ...typography.captionSmall,
    color: colors.error,
    marginTop: -spacing.sm,
  },
  submitError: {
    ...typography.captionSmall,
    color: colors.error,
    marginTop: spacing.md,
    textAlign: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
