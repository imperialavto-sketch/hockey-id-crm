import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { ErrorStateView } from "@/components/ui";
import { fetchParentTeams, type ParentTeamSummary } from "@/services/parentMessengerService";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography, radius, feedback } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function SelectTeamScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [teams, setTeams] = useState<ParentTeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setTeams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const list = await fetchParentTeams(user.id);
      setTeams(list);
    } catch {
      setTeams([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const openTeam = useCallback(
    (teamId: string) => {
      triggerHaptic();
      router.replace(`/team/feed?teamId=${encodeURIComponent(teamId)}` as never);
    },
    [router]
  );

  if (!user?.id) {
    return (
      <FlagshipScreen scroll={false}>
        <ScreenHeader title="Выбор команды" onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.muted}>Войдите в аккаунт</Text>
        </View>
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen scroll={false}>
      <ScreenHeader
        title="Выбор команды"
        subtitle="Для ленты и связи с командой"
        onBack={() => router.back()}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.padded}>
          <ErrorStateView variant="network" title="Не удалось загрузить команды" onAction={load} />
        </View>
      ) : teams.length === 0 ? (
        <View style={[styles.center, styles.padded]}>
          <Text style={styles.muted}>У вас пока нет привязанных команд</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {teams.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => openTeam(t.id)}
              style={({ pressed }) => [
                styles.row,
                pressed && { opacity: feedback.pressedOpacity },
              ]}
            >
              <View style={styles.rowText}>
                <Text style={styles.teamName}>{t.name}</Text>
                <Text style={styles.age}>{t.ageGroup}</Text>
              </View>
              <Text style={styles.cta}>Открыть</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  padded: {
    paddingHorizontal: spacing.screenPadding,
  },
  muted: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  list: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
  },
  teamName: {
    ...typography.body,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  age: {
    ...typography.captionSmall,
    color: colors.textMuted,
    marginTop: 4,
  },
  cta: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.accent,
  },
});
