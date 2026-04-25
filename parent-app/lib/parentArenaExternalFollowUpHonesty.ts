/**
 * Pure helpers + copy SSOT for parent Arena external follow-up (player screen).
 * Regression guards live in `parentArenaExternalFollowUpHonesty.selftest.ts`.
 */

export type FollowUpPostOutcome = "new" | "existing_same" | "unknown";

/** Body branch inside mounted SectionCard (defer hides whole section upstream). */
export type FollowUpSectionBodyState =
  | "loading"
  | "error"
  | "pending_active_request"
  | "no_follow_up_context"
  | "recommendation";

export function classifyFollowUpPostOutcome(
  preLatestId: string | null | undefined,
  resultId: string
): FollowUpPostOutcome {
  if (preLatestId === undefined) return "unknown";
  if (preLatestId === resultId) return "existing_same";
  return "new";
}

/** Banner + in-block success line (must stay aligned). */
export function followUpNonAutonomousOutcomeCopy(outcome: FollowUpPostOutcome): string {
  if (outcome === "existing_same") {
    return "Активный запрос уже есть; новый цикл не создавали. Ожидаем отчёт по текущему запросу.";
  }
  if (outcome === "new") {
    return "Новый запрос во внешнем контуре зарегистрирован. Подсказка появится после отчёта.";
  }
  return "Запрос обработан. Подсказка обновится, когда данные синхронизируются с сервером.";
}

export const FOLLOW_UP_PENDING_REPORT_EXPLAINER =
  "Запрос во внешнем контуре уже есть; отчёт по нему ещё не сохранён. Подсказка Арены появится после отчёта.";

export const FOLLOW_UP_NO_CONTEXT_EXPLAINER =
  "Сейчас нет подсказки для следующего шага: нет активного внешнего запроса с сохранённым отчётом, из которого Арена строит рекомендацию.";

export function classifyFollowUpSectionBody(args: {
  status: "idle" | "loading" | "ready" | "error";
  recommendation: unknown | null;
  latestExternalRequest: unknown | null;
}): FollowUpSectionBodyState {
  if (args.status === "idle" || args.status === "loading") return "loading";
  if (args.status === "error") return "error";
  if (args.recommendation != null) return "recommendation";
  if (args.latestExternalRequest != null) return "pending_active_request";
  return "no_follow_up_context";
}

/** Whole Arena follow-up section (SectionCard) mounts only when true. */
export function shouldMountArenaFollowUpSection(opts: {
  idTrim: string;
  player: unknown | null;
  profileLoading: boolean;
  userDeferred: boolean;
}): boolean {
  return Boolean(
    opts.idTrim && opts.player && !opts.profileLoading && !opts.userDeferred
  );
}

/** Silent refresh must not flip the section into blanket loading (spinner wipes feedback). */
export function followUpRefreshSetsSectionLoadingState(silent: boolean): boolean {
  return !silent;
}

export function createFollowUpPostInflightGuard() {
  const s = new Set<string>();
  return {
    tryBegin(pid: string): boolean {
      const k = pid.trim();
      if (!k || s.has(k)) return false;
      s.add(k);
      return true;
    },
    end(pid: string): void {
      s.delete(pid.trim());
    },
  };
}

/** Module-level guard for non-autonomous POST (one inflight per trimmed playerId). */
export const followUpPostInflight = createFollowUpPostInflightGuard();
