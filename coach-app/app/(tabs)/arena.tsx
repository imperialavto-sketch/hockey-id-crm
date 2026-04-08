/**
 * PHASE 6 — Coach live Arena: вход в живую тренировку школы (`live-training/*`, `/api/live-training/*`).
 * ❗ Не смешивать с: parent external `/api/arena/*`, marketplace.
 *
 * PHASE 3: `COACH_CANONICAL_LIVE_FLOW` — только `liveTrainingService`; не `coachSessionLiveService` / `/api/coach/sessions/*` (`docs/PHASE_3_APP_FLOW_LOCK.md`, `appFlowContours.ts`).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { type Href, useFocusEffect, useRouter } from "expo-router";
import { StaggerFadeIn } from "@/components/dashboard/StaggerFadeIn";
import {
  ArenaCapabilitiesStrip,
  ArenaErrorShell,
  ArenaHeroBlock,
  ArenaLoadingShell,
  ArenaSessionPanel,
} from "@/components/arena/ArenaLandingSections";
import {
  LiveTrainingEntryTransitionOverlay,
  type LiveTrainingEntryOverlayPayload,
} from "@/components/liveTraining/LiveTrainingEntryTransitionOverlay";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { theme } from "@/constants/theme";
import { ApiRequestError } from "@/lib/api";
import { isAuthRequiredError } from "@/lib/coachAuth";
import { coachHapticLight, coachHapticSelection } from "@/lib/coachHaptics";
import { formatLiveTrainingMode } from "@/lib/liveTrainingUi";
import {
  getActiveLiveTrainingSession,
  LIVE_TRAINING_START_ROUTE,
} from "@/services/liveTrainingService";
import type { LiveTrainingSession } from "@/types/liveTraining";

type ArenaLoadPhase = "loading" | "ready" | "error";

const ENTRY_NAV_MS = 380;

function arenaCtaTitle(active: LiveTrainingSession | null): string {
  if (!active) return "Начать тренировку";
  switch (active.status) {
    case "live":
      return "Продолжить тренировку";
    case "review":
      return "Перейти к проверке";
    case "confirmed":
      return "Открыть итог";
    default:
      return "Начать тренировку";
  }
}

function buildLiveTrainingEntry(
  active: LiveTrainingSession | null
): { href: Href; payload: LiveTrainingEntryOverlayPayload } {
  if (!active) {
    return {
      href: LIVE_TRAINING_START_ROUTE as Href,
      payload: {
        headline: "Запускаем тренировку…",
        contextLine: null,
        subline: "Дальше выберите команду и режим — всего пара шагов.",
      },
    };
  }
  const ctx = `${active.teamName} · ${formatLiveTrainingMode(active.mode)}`;
  if (active.status === "live") {
    return {
      href: `/live-training/${active.id}/live` as Href,
      payload: {
        headline: "Возвращаемся к эфиру…",
        contextLine: ctx,
        subline: "Тот же таймер и та же сессия — продолжаем без сброса.",
      },
    };
  }
  if (active.status === "review") {
    return {
      href: `/live-training/${active.id}/review` as Href,
      payload: {
        headline: "Открываем проверку…",
        contextLine: ctx,
        subline: "Наблюдения на месте — можно пройти шаг подтверждения.",
      },
    };
  }
  if (active.status === "confirmed") {
    return {
      href: `/live-training/${active.id}/complete` as Href,
      payload: {
        headline: "Открываем итог…",
        contextLine: ctx,
        subline: "Сводка и шаги после тренировки уже собраны.",
      },
    };
  }
  return {
    href: LIVE_TRAINING_START_ROUTE as Href,
    payload: {
      headline: "Запускаем тренировку…",
      contextLine: ctx,
      subline: "Новый эфир — с чистого старта на площадке.",
    },
  };
}

/**
 * Главный таб «Арена»: премиальный вход в live-flow только по CTA (без auto-redirect).
 */
export default function ArenaTabScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<ArenaLoadPhase>("loading");
  const [active, setActive] = useState<LiveTrainingSession | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pendingEntry, setPendingEntry] = useState<{
    href: Href;
    payload: LiveTrainingEntryOverlayPayload;
  } | null>(null);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchActive = useCallback(async () => {
    setPhase("loading");
    setFetchError(null);
    try {
      const s = await getActiveLiveTrainingSession();
      setActive(s);
      setPhase("ready");
    } catch (e) {
      setActive(null);
      setFetchError(
        isAuthRequiredError(e)
          ? "Требуется авторизация"
          : e instanceof ApiRequestError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Не удалось проверить активную тренировку"
      );
      setPhase("error");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchActive();
    }, [fetchActive])
  );

  useEffect(() => {
    if (!pendingEntry) {
      if (navTimerRef.current) {
        clearTimeout(navTimerRef.current);
        navTimerRef.current = null;
      }
      return;
    }
    navTimerRef.current = setTimeout(() => {
      navTimerRef.current = null;
      router.push(pendingEntry.href);
      setPendingEntry(null);
    }, ENTRY_NAV_MS);
    return () => {
      if (navTimerRef.current) {
        clearTimeout(navTimerRef.current);
        navTimerRef.current = null;
      }
    };
  }, [pendingEntry, router]);

  const cancelPendingEntry = useCallback(() => {
    setPendingEntry(null);
  }, []);

  const onPressCta = useCallback(() => {
    if (pendingEntry) return;
    coachHapticLight();
    coachHapticSelection();
    setPendingEntry(buildLiveTrainingEntry(active));
  }, [active, pendingEntry]);

  if (phase === "loading") {
    return (
      <ScreenContainer scroll={false} contentContainerStyle={styles.loadingRoot}>
        <ArenaLoadingShell caption="Проверяем активную тренировку…" />
      </ScreenContainer>
    );
  }

  if (phase === "error") {
    return (
      <ScreenContainer contentContainerStyle={styles.readyRoot}>
        <ArenaErrorShell
          message={fetchError ?? "Неизвестная ошибка"}
          onRetry={() => void fetchActive()}
        />
      </ScreenContainer>
    );
  }

  const revealKey = `${active?.id ?? "none"}:${active?.status ?? "none"}`;

  return (
    <ScreenContainer contentContainerStyle={styles.readyRoot}>
      <LiveTrainingEntryTransitionOverlay
        visible={pendingEntry != null}
        payload={pendingEntry?.payload ?? null}
        onRequestCancel={cancelPendingEntry}
      />
      <ArenaHeroBlock
        ctaTitle={arenaCtaTitle(active)}
        onPressCta={onPressCta}
        revealKey={revealKey}
        ctaDisabled={pendingEntry != null}
      />
      <StaggerFadeIn delay={56} preset="snappy" revealKey={revealKey}>
        <ArenaSessionPanel session={active} />
      </StaggerFadeIn>
      <StaggerFadeIn delay={112} preset="snappy" revealKey={revealKey}>
        <ArenaCapabilitiesStrip />
      </StaggerFadeIn>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flexGrow: 1,
  },
  readyRoot: {
    flexGrow: 1,
    paddingBottom: theme.spacing.sm,
  },
});
