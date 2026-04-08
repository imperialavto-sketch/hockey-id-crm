/**
 * PHASE 6: UI landing только для coach live Arena (LiveTrainingSession). Не external Arena parent-app и не voice-draft слота.
 * ⚠ AI-ASSISTED, NOT AUTONOMOUS AGENT — ассистент в копирайте = поддержка тренера, не автономный оркестратор бронирований.
 */
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { StaggerFadeIn } from "@/components/dashboard/StaggerFadeIn";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { theme } from "@/constants/theme";
import type { LiveTrainingSession } from "@/types/liveTraining";
import { formatLiveTrainingMode } from "@/lib/liveTrainingUi";

/** Монограмма HID — бренд, без метафоры «диктофона». */
export function ArenaHidMark() {
  return (
    <View style={markStyles.wrap}>
      <View style={markStyles.ring}>
        <Text style={markStyles.letters}>HID</Text>
      </View>
    </View>
  );
}

const markStyles = StyleSheet.create({
  wrap: {
    marginBottom: theme.spacing.lg,
  },
  ring: {
    alignSelf: "flex-start",
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.md + 4,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.primaryMuted,
  },
  letters: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 3.2,
    color: theme.colors.primary,
  },
});

const CAPABILITIES: Array<{ title: string; sub: string }> = [
  {
    title: "Слышит ход тренировки",
    sub: "Контекст площадки остаётся в фокусе, пока вы работаете с командой.",
  },
  {
    title: "Голос → структура",
    sub: "Наблюдения складываются в понятные заметки и сигналы для игроков.",
  },
  {
    title: "Не теряете следующий шаг",
    sub: "Ассистент помогает удержать внимание и перенести фокус в следующий раз.",
  },
];

function sessionStatusPill(session: LiveTrainingSession): { label: string; tone: "live" | "review" | "done" | "neutral" } {
  switch (session.status) {
    case "live":
      return { label: "В записи", tone: "live" };
    case "review":
      return { label: "На проверке", tone: "review" };
    case "confirmed":
      return { label: "Подтверждено", tone: "done" };
    case "cancelled":
      return { label: "Отменена", tone: "neutral" };
    case "idle":
    default:
      return { label: "Готово к старту", tone: "neutral" };
  }
}

function sessionDetailLine(session: LiveTrainingSession | null): string {
  if (!session) {
    return "Когда выйдете на лёд или зал, запустите живую тренировку — ассистент подстроится под ваш голос и темп сессии.";
  }
  switch (session.status) {
    case "live":
      return "Вернитесь к эфиру, чтобы продолжить фиксацию — таймер и события ждут на экране тренировки.";
    case "review":
      return "Проверьте наблюдения перед подтверждением — так вы контролируете, что уйдёт в аналитику и карточки игроков.";
    case "confirmed":
      return "Итог и следующие шаги собраны на экране завершения — откройте, когда будете готовы.";
    case "cancelled":
      return "Можно спокойно начать новую сессию, когда снова будете на площадке.";
    case "idle":
    default:
      return "Сессия в ожидании — начните с привычного сценария живой тренировки.";
  }
}

function pillColor(tone: "live" | "review" | "done" | "neutral") {
  switch (tone) {
    case "live":
      return { bg: theme.colors.primaryMuted, text: theme.colors.primary };
    case "review":
      return { bg: theme.colors.warningMuted, text: theme.colors.warning };
    case "done":
      return { bg: theme.colors.accentMuted, text: theme.colors.accent };
    default:
      return { bg: theme.colors.surfaceElevated, text: theme.colors.textSecondary };
  }
}

type ArenaSessionPanelProps = {
  session: LiveTrainingSession | null;
};

/** Компактный статус сессии без второго CTA — только контекст под главной кнопкой. */
export function ArenaSessionPanel({ session }: ArenaSessionPanelProps) {
  return (
    <SectionCard elevated style={sessionStyles.card}>
      <Text style={sessionStyles.kicker}>Сессия</Text>
      {!session ? (
        <>
          <Text style={sessionStyles.title}>Нет активной тренировки</Text>
          <Text style={sessionStyles.body}>{sessionDetailLine(null)}</Text>
        </>
      ) : (
        <>
          <View style={sessionStyles.rowTop}>
            {(() => {
              const { label, tone } = sessionStatusPill(session);
              const c = pillColor(tone);
              return (
                <View style={[sessionStyles.pill, { backgroundColor: c.bg }]}>
                  <Text style={[sessionStyles.pillText, { color: c.text }]}>{label}</Text>
                </View>
              );
            })()}
          </View>
          <Text style={sessionStyles.meta}>
            {session.teamName} · {formatLiveTrainingMode(session.mode)}
          </Text>
          <Text style={sessionStyles.body}>{sessionDetailLine(session)}</Text>
        </>
      )}
    </SectionCard>
  );
}

const sessionStyles = StyleSheet.create({
  card: {
    marginBottom: 0,
  },
  kicker: {
    ...theme.typography.heroEyebrow,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  title: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  meta: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  body: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    lineHeight: 22,
  },
});

export function ArenaCapabilitiesStrip() {
  return (
    <View style={stripStyles.wrap}>
      <Text style={stripStyles.stripKicker}>Возможности Арены</Text>
      {CAPABILITIES.map((item, i) => (
        <View key={item.title} style={[stripStyles.row, i > 0 && stripStyles.rowBorder]}>
          <View style={stripStyles.accentBar} />
          <View style={stripStyles.textCol}>
            <Text style={stripStyles.rowTitle}>{item.title}</Text>
            <Text style={stripStyles.rowSub}>{item.sub}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const stripStyles = StyleSheet.create({
  wrap: {
    marginTop: theme.layout.sectionGap,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  stripKicker: {
    ...theme.typography.heroEyebrow,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  accentBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
    opacity: 0.85,
    marginTop: 3,
    minHeight: 36,
  },
  textCol: {
    flex: 1,
  },
  rowTitle: {
    ...theme.typography.subtitle,
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 4,
  },
  rowSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
});

type ArenaHeroBlockProps = {
  ctaTitle: string;
  onPressCta: () => void;
  revealKey: string;
  ctaDisabled?: boolean;
};

export function ArenaHeroBlock({
  ctaTitle,
  onPressCta,
  revealKey,
  ctaDisabled = false,
}: ArenaHeroBlockProps) {
  return (
    <StaggerFadeIn delay={0} preset="snappy" revealKey={revealKey}>
      <View style={heroStyles.block}>
        <ArenaHidMark />
        <Text style={heroStyles.brandEyebrow}>Hockey ID</Text>
        <Text style={heroStyles.name}>Арена</Text>
        <Text style={heroStyles.valueLine}>
          Умный помощник тренера во время тренировки
        </Text>
        <Text style={heroStyles.support}>
          Слушает, структурирует и помогает не терять важное — чтобы на площадке оставаться с командой, а не с формами.
        </Text>
        <PrimaryButton
          title={ctaTitle}
          onPress={onPressCta}
          animatedPress
          disabled={ctaDisabled}
          style={heroStyles.cta}
          accessibilityHint="Открывает сценарий живой тренировки"
        />
      </View>
    </StaggerFadeIn>
  );
}

const heroStyles = StyleSheet.create({
  block: {
    marginBottom: theme.layout.sectionGap,
  },
  brandEyebrow: {
    ...theme.typography.caption,
    fontWeight: "600",
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  name: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 40,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  valueLine: {
    fontSize: 17,
    fontWeight: "600",
    color: theme.colors.text,
    lineHeight: 24,
    marginBottom: theme.spacing.md,
    maxWidth: 340,
  },
  support: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
    maxWidth: 360,
  },
  cta: {
    alignSelf: "stretch",
  },
});

type ArenaLoadingShellProps = {
  caption: string;
};

export function ArenaLoadingShell({ caption }: ArenaLoadingShellProps) {
  return (
    <View style={loadStyles.center}>
      <StaggerFadeIn delay={0} preset="snappy" revealKey="arena-load">
        <SectionCard elevated style={loadStyles.card}>
          <View style={loadStyles.inner}>
            <ArenaHidMark />
            <Text style={loadStyles.brand}>Hockey ID · Арена</Text>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={loadStyles.caption}>{caption}</Text>
          </View>
        </SectionCard>
      </StaggerFadeIn>
    </View>
  );
}

const loadStyles = StyleSheet.create({
  center: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: theme.spacing.xl,
  },
  card: {
    marginBottom: 0,
  },
  inner: {
    alignItems: "center",
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  brand: {
    ...theme.typography.caption,
    fontWeight: "600",
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
  },
  caption: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
});

type ArenaErrorShellProps = {
  message: string;
  onRetry: () => void;
};

export function ArenaErrorShell({ message, onRetry }: ArenaErrorShellProps) {
  return (
    <View style={errStyles.root}>
      <StaggerFadeIn delay={0} preset="snappy" revealKey="arena-err">
        <ArenaHidMark />
        <Text style={errStyles.title}>Не удалось обновить Арену</Text>
        <Text style={errStyles.sub}>
          Проверьте соединение и попробуйте снова — состояние живой тренировки подтянется с сервера.
        </Text>
      </StaggerFadeIn>
      <StaggerFadeIn delay={70} preset="snappy" revealKey="arena-err-card">
        <SectionCard elevated style={errStyles.card}>
          <Text style={errStyles.error}>{message}</Text>
          <PrimaryButton title="Повторить" onPress={onRetry} animatedPress />
        </SectionCard>
      </StaggerFadeIn>
    </View>
  );
}

const errStyles = StyleSheet.create({
  root: {
    flexGrow: 1,
    paddingTop: theme.spacing.sm,
  },
  title: {
    ...theme.typography.title,
    fontSize: 22,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  sub: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  card: {
    marginBottom: 0,
  },
  error: {
    ...theme.typography.body,
    color: theme.colors.error,
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
});
