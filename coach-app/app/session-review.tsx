import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { isAuthRequiredError } from "@/lib/coachAuth";
import {
  loadSessionReviewSummary,
  type SessionReviewSummary,
  type SessionPlayerSummary,
} from "@/lib/sessionReviewCenterHelpers";
import {
  buildTeamSessionSummary,
  type TeamSessionSummary,
} from "@/lib/teamSessionSummaryHelpers";
import { buildSessionFollowUpItems } from "@/lib/sessionFollowUpHelpers";
import { theme } from "@/constants/theme";

function pluralObs(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "наблюдение";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "наблюдения";
  return "наблюдений";
}

function pluralPlayer(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "игрок";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "игрока";
  return "игроков";
}

function EmptyState({ onOpenCapture }: { onOpenCapture: () => void }) {
  return (
    <ScreenContainer contentContainerStyle={styles.emptyContainer}>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>Пока нет итогов</Text>
        <Text style={styles.emptyText}>
          Запишите тренировку
        </Text>
        <PrimaryButton
          title="Записать тренировку"
          onPress={onOpenCapture}
          style={styles.emptyCta}
        />
      </View>
    </ScreenContainer>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function TeamSessionSummaryBlock({ teamSummary }: { teamSummary: TeamSessionSummary }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!teamSummary.copyText) return;
    try {
      await Clipboard.setStringAsync(teamSummary.copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert("Ошибка", "Не удалось скопировать");
    }
  };

  return (
    <View style={styles.summaryBlock}>
      <Text style={styles.summaryEyebrow}>Coach Mark</Text>
      <Text style={styles.summaryTitle}>Сводка по тренировке</Text>
      <Text style={styles.summaryHeadline}>{teamSummary.summaryHeadline}</Text>
      <View style={styles.summaryLines}>
        <View style={styles.summaryLine}>
          <Text style={styles.summaryLineLabel}>Что получилось</Text>
          <Text style={styles.summaryLineValue}>{teamSummary.strengthsLine}</Text>
        </View>
        <View style={styles.summaryLine}>
          <Text style={styles.summaryLineLabel}>На что обратить внимание</Text>
          <Text style={styles.summaryLineValue}>{teamSummary.attentionLine}</Text>
        </View>
        <View style={styles.summaryLine}>
          <Text style={styles.summaryLineLabel}>Рекомендация</Text>
          <Text style={styles.summaryLineValue}>{teamSummary.recommendationLine}</Text>
        </View>
      </View>
      <View style={styles.summaryChips}>
        <View style={styles.summaryChip}>
          <Text style={styles.summaryChipValue}>{teamSummary.uniquePlayers}</Text>
          <Text style={styles.summaryChipLabel}>игроков</Text>
        </View>
        <View style={styles.summaryChip}>
          <Text style={styles.summaryChipValue}>{teamSummary.observationCount}</Text>
          <Text style={styles.summaryChipLabel}>наблюдений</Text>
        </View>
        {teamSummary.topSkills.length > 0 && (
          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipValue} numberOfLines={1}>
              {teamSummary.topSkills.map((s) => s.label).join(", ")}
            </Text>
            <Text style={styles.summaryChipLabel}>топ навыки</Text>
          </View>
        )}
      </View>
      <PrimaryButton
        title={copied ? "Скопировано" : "Скопировать"}
        variant="outline"
        onPress={handleCopy}
        disabled={copied}
        style={styles.summaryCopyBtn}
      />
    </View>
  );
}

function PlayerRow({
  player,
  onOpenPlayer,
  onOpenReport,
}: {
  player: SessionPlayerSummary;
  onOpenPlayer: () => void;
  onOpenReport: () => void;
}) {
  return (
    <View style={styles.playerRow}>
      <View style={styles.playerMain}>
        <Text style={styles.playerName}>{player.playerName}</Text>
        <Text style={styles.playerMeta}>
          {player.observationCountInSession} {pluralObs(player.observationCountInSession)}
          {player.statusLabel ? ` · ${player.statusLabel}` : ""}
        </Text>
      </View>
      <View style={styles.playerActions}>
        <PrimaryButton
          title="Открыть"
          variant="ghost"
          onPress={onOpenPlayer}
          style={styles.playerBtn}
          textStyle={styles.playerBtnText}
        />
        {player.hasReport && (
          <PrimaryButton
            title="Открыть"
            variant="outline"
            onPress={onOpenReport}
            style={styles.playerBtn}
            textStyle={styles.playerBtnText}
          />
        )}
      </View>
    </View>
  );
}

export default function SessionReviewScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<SessionReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(() => {
    setLoading(true);
    setError(null);
    loadSessionReviewSummary()
      .then((s) => {
        setSummary(s);
        setError(null);
      })
      .catch((err) => {
        setSummary(null);
        setError(isAuthRequiredError(err) ? "Требуется авторизация" : "Не удалось загрузить итоги");
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => fetchSummary(), [fetchSummary]));

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Загрузка…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer contentContainerStyle={styles.content}>
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>{error}</Text>
          <Text style={styles.errorText}>Проверьте соединение и попробуйте снова</Text>
          <PrimaryButton title="Повторить" variant="outline" onPress={fetchSummary} style={styles.retryBtn} />
          <PrimaryButton title="Назад" variant="ghost" onPress={() => router.back()} style={styles.backBtn} />
        </View>
      </ScreenContainer>
    );
  }

  if (!summary?.session) {
    return (
      <EmptyState onOpenCapture={() => router.push("/dev/coach-input")} />
    );
  }

  const { observationCount, uniquePlayers, reportsReady, draftsReady, players } = summary;
  const teamSummary = useMemo(
    () => buildTeamSessionSummary(summary.session),
    [summary.session]
  );
  const followUpItems = useMemo(
    () => buildSessionFollowUpItems(summary.session, players),
    [summary.session, players]
  );

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Итоги тренировки</Text>
          <Text style={styles.heroSubtitle}>
            {observationCount} {pluralObs(observationCount)} · {uniquePlayers}{" "}
            {pluralPlayer(uniquePlayers)}
          </Text>
          <Text style={styles.heroSummary}>
            Наблюдения сохранены. Ниже — что готово по итогам тренировки.
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <MetricCard label="Наблюдений" value={observationCount} />
          <MetricCard label="Игроков" value={uniquePlayers} />
          <MetricCard label="Готовых отчётов" value={reportsReady} />
          <MetricCard label="Черновиков родителям" value={draftsReady} />
        </View>

        {teamSummary.hasData && (
          <View style={styles.section}>
            <View style={styles.summaryCard}>
              <TeamSessionSummaryBlock teamSummary={teamSummary} />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Что сделать дальше</Text>
          <SectionCard elevated>
            {followUpItems.length > 0 ? (
              followUpItems.map((item, i) => (
                <View
                  key={item.playerId}
                  style={[
                    styles.followUpItemWrap,
                    i < followUpItems.length - 1 && styles.followUpItemBorder,
                  ]}
                >
                  <View style={styles.followUpItemMain}>
                    <Text style={styles.followUpPlayerName}>{item.playerName}</Text>
                    <Text style={styles.followUpTypeLabel}>{item.typeLabel}</Text>
                    <Text style={styles.followUpReason}>{item.reasonLine}</Text>
                  </View>
                  <PrimaryButton
                    title={item.ctaLabel}
                    variant="outline"
                    onPress={() => router.push(item.ctaRoute as Parameters<typeof router.push>[0])}
                    style={styles.followUpCta}
                    textStyle={styles.followUpCtaText}
                  />
                </View>
              ))
            ) : (
              <Text style={styles.followUpEmpty}>
                Coach Mark не выявил срочных шагов
              </Text>
            )}
          </SectionCard>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Игроки в сессии</Text>
          <SectionCard elevated>
            {players.length === 0 ? (
              <Text style={styles.noPlayers}>Нет игроков в этой сессии</Text>
            ) : (
              players.map((player, i) => (
                <View
                  key={player.playerId}
                  style={[styles.playerRowWrap, i < players.length - 1 && styles.playerRowBorder]}
                >
                  <PlayerRow
                    player={player}
                    onOpenPlayer={() => router.push(`/player/${player.playerId}`)}
                    onOpenReport={() =>
                      router.push(`/player/${player.playerId}/report`)
                    }
                  />
                </View>
              ))
            )}
          </SectionCard>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Что можно сделать дальше</Text>
          <SectionCard elevated>
            <View style={styles.nextActions}>
              <PrimaryButton
                title="Отчёты недели"
                variant="outline"
                onPress={() => router.push("/reports")}
                style={styles.nextActionBtn}
              />
              <PrimaryButton
                title="Черновики родителям"
                variant="outline"
                onPress={() => router.push("/parent-drafts")}
                style={styles.nextActionBtn}
              />
              <PrimaryButton
                title="Требуют внимания"
                variant="outline"
                onPress={() => router.push("/actions")}
                style={styles.nextActionBtn}
              />
              <PrimaryButton
                title="На главную"
                variant="ghost"
                onPress={() => router.replace("/(tabs)")}
                style={styles.nextActionBtn}
              />
            </View>
          </SectionCard>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xxl,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  errorWrap: {
    flex: 1,
    padding: theme.spacing.lg,
    alignItems: "center",
    gap: theme.spacing.md,
  },
  errorTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    textAlign: "center",
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  retryBtn: { alignSelf: "stretch" },
  backBtn: { alignSelf: "stretch" },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  emptyCard: {
    maxWidth: 320,
    alignItems: "center",
    gap: theme.spacing.md,
  },
  emptyTitle: {
    ...theme.typography.hero,
    color: theme.colors.text,
    textAlign: "center",
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  emptyCta: {
    marginTop: theme.spacing.sm,
  },
  hero: {
    marginBottom: theme.spacing.xl,
  },
  heroTitle: {
    ...theme.typography.hero,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  heroSubtitle: {
    ...theme.typography.subtitle,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  heroSummary: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  metricCard: {
    flex: 1,
    minWidth: 80,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  metricValue: {
    ...theme.typography.title,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  metricLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  noPlayers: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  playerRowWrap: {
    paddingVertical: theme.spacing.sm,
  },
  playerRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  playerMain: {
    flex: 1,
    minWidth: 120,
  },
  playerName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  playerMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  playerActions: {
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  playerBtn: {
    paddingHorizontal: theme.spacing.sm,
  },
  playerBtnText: {
    fontSize: 14,
  },
  followUpItemWrap: {
    paddingVertical: theme.spacing.md,
  },
  followUpItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  followUpItemMain: {
    marginBottom: theme.spacing.sm,
  },
  followUpPlayerName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  followUpTypeLabel: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  followUpReason: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  followUpCta: {
    alignSelf: "flex-start",
  },
  followUpCtaText: {
    fontSize: 14,
  },
  followUpEmpty: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    fontStyle: "italic",
    paddingVertical: theme.spacing.md,
  },
  nextActions: {
    gap: theme.spacing.sm,
  },
  nextActionBtn: {},
  summaryCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  summaryBlock: {
    gap: theme.spacing.md,
  },
  summaryEyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: theme.colors.primary,
    textTransform: "uppercase",
  },
  summaryTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  summaryHeadline: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  summaryLines: {
    gap: theme.spacing.sm,
  },
  summaryLine: {
    gap: theme.spacing.xs,
  },
  summaryLineLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  summaryLineValue: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 20,
  },
  summaryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  summaryChip: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  summaryChipValue: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: "600",
  },
  summaryChipLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  summaryCopyBtn: {},
});
