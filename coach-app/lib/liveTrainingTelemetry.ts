/**
 * Client-side Live Training telemetry (structured logs).
 * Каждый вызов отправляет уникальный `clientMutationId` (или переданный явно) для идемпотентной обработки на backend.
 *
 * @see LIVE_TRAINING_TELEMETRY_CONTRACT в конце файла (контракт для API).
 */

import { API_BASE_URL } from "@/lib/config";
import { getAuthToken } from "@/lib/api";
import { createClientMutationId } from "@/lib/liveTrainingClientMutationId";

const ANALYTICS_URL = (process.env.EXPO_PUBLIC_COACH_ANALYTICS_URL ?? "").trim();

export type LiveTrainingTelemetryEventName =
  | "lt_review_open"
  | "lt_review_fast_confirm_tap"
  | "lt_confirm_attempt"
  | "lt_confirm_success"
  | "lt_confirm_fail"
  | "lt_patch_draft_attempt"
  | "lt_patch_draft_success"
  | "lt_patch_draft_fail"
  | "lt_delete_draft_attempt"
  | "lt_delete_draft_success"
  | "lt_delete_draft_fail"
  | "lt_event_post_success"
  | "lt_event_post_queued"
  | "lt_outbox_flush_start"
  | "lt_outbox_flush_done"
  | "lt_finish_guard_blocked"
  | "lt_nudge_action_cta";

/** Поля события без служебных ключей телеметрии */
export type LiveTrainingTelemetryPayload = Record<string, unknown>;

/** Тело POST на аналитический endpoint */
export type LiveTrainingTelemetryEnvelope = {
  event: LiveTrainingTelemetryEventName;
  ts: string;
  clientMutationId: string;
} & LiveTrainingTelemetryPayload;

export type TrackLiveTrainingEventOptions = {
  /** Если задан — используется как clientMutationId конверта (повторная отправка того же события) */
  clientMutationId?: string;
};

/** Фазы UI для стыковки с модалкой правки (Saving / Saved / Error) */
export type LiveTrainingPatchTelemetryUiPhase = "saving" | "saved" | "error";

/** Фазы удаления черновика */
export type LiveTrainingDeleteTelemetryUiPhase = "deleting" | "deleted" | "error";

/** Фазы подтверждения сессии */
export type LiveTrainingConfirmTelemetryUiPhase = "confirming" | "confirmed" | "error";

function stripTelemetryClientMutationId(payload: LiveTrainingTelemetryPayload): LiveTrainingTelemetryPayload {
  if (!payload || typeof payload !== "object") return {};
  const { clientMutationId: _omit, ...rest } = payload as LiveTrainingTelemetryPayload & {
    clientMutationId?: unknown;
  };
  return rest;
}

export function trackLiveTrainingEvent(
  name: LiveTrainingTelemetryEventName,
  payload: LiveTrainingTelemetryPayload = {},
  options?: TrackLiveTrainingEventOptions
): void {
  const clientMutationId = options?.clientMutationId ?? createClientMutationId();
  const rest = stripTelemetryClientMutationId(payload);
  const body: LiveTrainingTelemetryEnvelope = {
    event: name,
    ts: new Date().toISOString(),
    clientMutationId,
    ...rest,
  };

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // eslint-disable-next-line no-console
    console.log("[LiveTrainingTelemetry]", body);
  }
  if (!ANALYTICS_URL) return;
  const url = ANALYTICS_URL.startsWith("http") ? ANALYTICS_URL : `${API_BASE_URL}${ANALYTICS_URL}`;
  void (async () => {
    const token = await getAuthToken();
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      credentials: "omit",
    }).catch(() => {});
  })();
}

/**
 * ## LIVE_TRAINING_TELEMETRY_CONTRACT (coach analytics POST)
 *
 * **URL:** `EXPO_PUBLIC_COACH_ANALYTICS_URL` (абсолютный или путь от `API_BASE_URL`)
 *
 * **Content-Type:** application/json
 *
 * **Обязательные поля:**
 * - `event` — одно из имён LiveTrainingTelemetryEventName
 * - `ts` — ISO-8601
 * - `clientMutationId` — UUID (генерация: `createClientMutationId()`); идемпотентность **доставки телеметрии** при повторном POST с тем же значением
 *
 * **Опционально (корреляция с CRM API):**
 * - `ingestClientMutationId` — UUID, переданный в теле/заголовке CRM для patch/delete/confirm/POST events; позволяет связать строку аналитики с мутацией API
 *
 * **Опционально (фазы UI, `uiPhase`):**
 * - patch: `saving` | `saved` | `error`
 * - delete: `deleting` | `deleted` | `error`
 * - confirm: `confirming` | `confirmed` | `error`
 * - live / outbox: `posted` | `queued` | `flush_start` | `flush_done` | `blocked`
 * - review screen: `loaded` (открыт экран), `intent` (тап «Быстро подтвердить» до диалога)
 *
 * **Правка черновика (`lt_patch_draft_*`):** `quickApply: true` — чип быстрой правки; `quickApply: false` — полная правка в модалке; поле `suggestionId` только при `quickApply: true`
 *
 * **Прочие поля:** `sessionId`, `draftId`, `source`, `remaining`, `status`, `draftsTotal`, … — по событию.
 *
 * **Дедуп на backend:** по `clientMutationId` или составному `(event, clientMutationId)`.
 */
