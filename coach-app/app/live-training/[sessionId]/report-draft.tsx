/** PHASE 3: `COACH_CANONICAL_LIVE_FLOW` (`docs/PHASE_3_APP_FLOW_LOCK.md`). */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { theme } from "@/constants/theme";
import { ApiRequestError } from "@/lib/api";
import { hasCrmSlotLinkageForPublish } from "@/lib/liveTrainingScheduleRouteContext";
import { buildReportTeamBehaviorContextLine } from "@/lib/behavioralExplainabilityUi";
import { COACH_SESSION_DETAIL_COPY } from "@/lib/coachScheduleSessionDetailUi";
import { buildLiveTrainingArenaAutoExplainLines } from "@/lib/liveTrainingArenaAutoExplain";
import { formatLiveTrainingMetricDomain } from "@/lib/liveTrainingMetricDomainLabel";
import { formatLiveTrainingMode } from "@/lib/liveTrainingUi";
import {
  applyLiveTrainingArenaNextTrainingFocus,
  confirmLiveTrainingExternalCoachRecommendation,
  dismissLiveTrainingExternalCoachRecommendation,
  fetchLiveTrainingSessionActionCandidates,
  getLiveTrainingExternalCoachFeedback,
  getLiveTrainingReportDraft,
  getLiveTrainingSession,
  materializeLiveTrainingSessionActionCandidate,
  publishLiveTrainingReportDraft,
  saveLiveTrainingExternalCoachFeedback,
  saveReportDraftNarrative,
} from "@/services/liveTrainingService";
import {
  getPlayerZeroFollowUpWhenDistinctFromTeam,
  pickSessionMeaningFollowUpMvpLine,
  sessionMeaningFollowUpCandidateId,
} from "@shared/live-training/session-meaning-follow-up-task";
import { getTrainingVoiceBehavioralSuggestions } from "@/services/coachScheduleService";
import type {
  LiveTrainingCoachPreviewNarrativeV1,
  LiveTrainingCoachView,
  LiveTrainingExternalCoachRecommendationRow,
  LiveTrainingParentView,
  LiveTrainingPublishedFinalReportRead,
  ArenaNextTrainingFocusApplyState,
  LiveTrainingReportDraftPayload,
  LiveTrainingSchoolView,
  LiveTrainingSession,
  LiveTrainingSessionMeaningNextActionsV1,
  LiveTrainingSessionMeaningProgressV1,
  LiveTrainingSessionMeaningActionTriggerV1,
  LiveTrainingSessionMeaningSuggestedCoachV1,
  LiveTrainingExternalWorkImpactRowV1,
} from "@/types/liveTraining";

type AudienceTab = "coach" | "parent" | "school";

function directionLabel(d: string): string {
  if (d === "positive") return "+";
  if (d === "negative") return "−";
  return "○";
}

function hasCoachNarrativeContent(n: LiveTrainingCoachPreviewNarrativeV1 | undefined): boolean {
  if (!n) return false;
  return (
    n.sessionSummaryLines.some((s) => s.trim().length > 0) ||
    n.focusAreas.some((s) => s.trim().length > 0) ||
    n.playerHighlights.some((h) => h.text.trim().length > 0)
  );
}

function emptyCoachNarrative(): LiveTrainingCoachPreviewNarrativeV1 {
  return { sessionSummaryLines: [], focusAreas: [], playerHighlights: [] };
}

function cloneCoachNarrative(n: LiveTrainingCoachPreviewNarrativeV1 | undefined): LiveTrainingCoachPreviewNarrativeV1 {
  if (!n) return emptyCoachNarrative();
  return {
    sessionSummaryLines: [...n.sessionSummaryLines],
    focusAreas: [...n.focusAreas],
    playerHighlights: n.playerHighlights.map((h) => ({
      playerId: h.playerId ?? null,
      playerName: h.playerName ?? null,
      text: h.text,
    })),
  };
}

function buildNarrativePatchBody(n: LiveTrainingCoachPreviewNarrativeV1): LiveTrainingCoachPreviewNarrativeV1 {
  return {
    sessionSummaryLines: n.sessionSummaryLines.map((s) => s.trim()).filter((s) => s.length > 0),
    focusAreas: n.focusAreas.map((s) => s.trim()).filter((s) => s.length > 0),
    playerHighlights: n.playerHighlights
      .map((h) => {
        const text = h.text.trim();
        if (!text) return null;
        const pid = typeof h.playerId === "string" && h.playerId.trim() ? h.playerId.trim() : null;
        const pname = typeof h.playerName === "string" && h.playerName.trim() ? h.playerName.trim() : null;
        return { text, playerId: pid, playerName: pname };
      })
      .filter((x): x is NonNullable<typeof x> => x != null),
  };
}

function ReportDraftArenaNextTrainingFocusApplyBlock({
  focusLine,
  apply,
  onApply,
  busy,
  errorText,
}: {
  focusLine: string;
  apply: ArenaNextTrainingFocusApplyState;
  onApply: () => void;
  busy: boolean;
  errorText: string | null;
}) {
  const canPress =
    !apply.applied && apply.nextSlotAvailable && apply.focusLineFromMeaning != null && !busy;
  return (
    <SectionCard elevated style={styles.card}>
      <Text style={styles.kicker}>Фокус следующей тренировки:</Text>
      <Text style={[styles.arenaActionMicroMuted, styles.arenaFocusMicroBelowKicker]}>
        Запишется в план следующей тренировки
      </Text>
      <Text style={styles.bodyLine}>{focusLine}</Text>
      {!apply.nextSlotAvailable ? (
        <Text style={[styles.mutedLine, { marginTop: 8 }]}>
          Нет ближайшей тренировки в расписании — применение недоступно.
        </Text>
      ) : null}
      {apply.applied ? (
        <Text style={[styles.narrativeSaveOk, { marginTop: 12 }]}>Применено</Text>
      ) : (
        <PrimaryButton
          title={busy ? "Применение…" : "Применить к тренировке"}
          onPress={onApply}
          disabled={!canPress}
          animatedPress
          style={styles.arenaNextFocusApplyButton}
        />
      )}
      {errorText ? (
        <Text style={[styles.narrativeSaveError, { marginTop: 8 }]}>{errorText}</Text>
      ) : null}
    </SectionCard>
  );
}

function ReportDraftMeaningFollowUpTaskRow({
  liveSessionId,
  next,
}: {
  liveSessionId: string;
  next: LiveTrainingSessionMeaningNextActionsV1;
}) {
  const router = useRouter();
  const pick = useMemo(
    () => pickSessionMeaningFollowUpMvpLine({ team: next.team, players: next.players }),
    [next.team, next.players]
  );
  const candidateId = useMemo(
    () => (pick ? sessionMeaningFollowUpCandidateId(liveSessionId, pick) : null),
    [liveSessionId, pick]
  );

  const [loading, setLoading] = useState(true);
  const [materialized, setMaterialized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!candidateId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchLiveTrainingSessionActionCandidates(liveSessionId)
      .then((r) => {
        if (cancelled) return;
        const hit = r.items.find((i) => i.id === candidateId);
        setMaterialized(Boolean(hit?.isMaterialized));
      })
      .catch(() => {
        if (!cancelled) setMaterialized(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [liveSessionId, candidateId]);

  if (!pick || !candidateId) return null;

  const taskButtonTitle =
    pick.kind === "team" ? "В задачи (команда)" : "В задачи (игрок)";

  return (
    <View style={styles.meaningFollowUpTaskBlock}>
      <Text style={styles.nextActionsLine}>{pick.line}</Text>
      {materialized ? (
        <Text style={[styles.narrativeSaveOk, styles.meaningFollowUpTaskStatus]}>Уже в задачах</Text>
      ) : (
        <PrimaryButton
          title={busy ? "Добавление…" : taskButtonTitle}
          onPress={() => {
            setBusy(true);
            setErr(null);
            void materializeLiveTrainingSessionActionCandidate(liveSessionId, candidateId)
              .then(() => {
                setMaterialized(true);
              })
              .catch((e) => {
                setErr(e instanceof ApiRequestError ? e.message : "Не удалось добавить задачу.");
              })
              .finally(() => {
                setBusy(false);
              });
          }}
          disabled={loading || busy}
          animatedPress
          style={styles.meaningFollowUpTaskButton}
        />
      )}
      <Pressable
        onPress={() => router.push("/created-actions" as Parameters<typeof router.push>[0])}
        style={({ pressed }) => [styles.meaningFollowUpTaskLinkWrap, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.meaningFollowUpTaskLink}>Открыть созданные задачи</Text>
      </Pressable>
      {err ? (
        <Text style={[styles.narrativeSaveError, styles.meaningFollowUpTaskError]}>{err}</Text>
      ) : null}
    </View>
  );
}

/** Персональная задача players[0].actions[0], только если есть team-строка и текст отличается (сервер тот же candidateId). */
function ReportDraftPlayerMeaningFollowUpRow({
  liveSessionId,
  next,
}: {
  liveSessionId: string;
  next: LiveTrainingSessionMeaningNextActionsV1;
}) {
  const router = useRouter();
  const row = useMemo(
    () =>
      getPlayerZeroFollowUpWhenDistinctFromTeam(liveSessionId, {
        team: next.team,
        players: next.players,
      }),
    [liveSessionId, next.team, next.players]
  );

  const [loading, setLoading] = useState(true);
  const [materialized, setMaterialized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const candidateId = row?.candidateId ?? null;

  useEffect(() => {
    if (!candidateId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchLiveTrainingSessionActionCandidates(liveSessionId)
      .then((r) => {
        if (cancelled) return;
        const hit = r.items.find((i) => i.id === candidateId);
        setMaterialized(Boolean(hit?.isMaterialized));
      })
      .catch(() => {
        if (!cancelled) setMaterialized(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [liveSessionId, candidateId]);

  if (!row || !candidateId) return null;

  return (
    <View style={styles.playerMeaningFollowUpBlock}>
      <Text style={styles.playerMeaningFollowUpLine}>
        {row.playerName} — {row.line}
      </Text>
      {materialized ? (
        <Text style={[styles.narrativeSaveOk, styles.meaningFollowUpTaskStatus]}>Уже в задачах</Text>
      ) : (
        <PrimaryButton
          title={busy ? "Добавление…" : "В задачи (игрок)"}
          onPress={() => {
            setBusy(true);
            setErr(null);
            void materializeLiveTrainingSessionActionCandidate(liveSessionId, candidateId)
              .then(() => {
                setMaterialized(true);
              })
              .catch((e) => {
                setErr(e instanceof ApiRequestError ? e.message : "Не удалось добавить задачу.");
              })
              .finally(() => {
                setBusy(false);
              });
          }}
          disabled={loading || busy}
          animatedPress
          style={styles.meaningFollowUpTaskButton}
        />
      )}
      <Pressable
        onPress={() => router.push("/created-actions" as Parameters<typeof router.push>[0])}
        style={({ pressed }) => [styles.meaningFollowUpTaskLinkWrap, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.meaningFollowUpTaskLink}>Открыть созданные задачи</Text>
      </Pressable>
      {err ? (
        <Text style={[styles.narrativeSaveError, styles.meaningFollowUpTaskError]}>{err}</Text>
      ) : null}
    </View>
  );
}

function ReportDraftNextActionsBlock({
  next,
  liveSessionId,
}: {
  next: LiveTrainingSessionMeaningNextActionsV1;
  liveSessionId: string;
}) {
  const has =
    next.team.length > 0 || next.players.length > 0 || next.nextTrainingFocus.length > 0;
  if (!has) return null;
  const showMeaningTaskRows = next.team.length > 0 || next.players.length > 0;
  return (
    <SectionCard elevated style={styles.card}>
      <Text style={styles.kicker}>Что делать дальше</Text>

      <Text style={styles.arenaActionSectionTitle}>Что предлагает Арена</Text>
      {next.team.length > 0 ? (
        <>
          <Text style={styles.nextActionsSubkicker}>Команде</Text>
          {next.team.map((line, i) => (
            <Text key={`na-team-${i}`} style={styles.nextActionsLine}>
              • {line}
            </Text>
          ))}
        </>
      ) : null}
      {next.players.length > 0 ? (
        <>
          <Text style={[styles.nextActionsSubkicker, next.team.length > 0 && { marginTop: 10 }]}>
            Игрокам в фокусе
          </Text>
          {next.players.map((p) => (
            <View key={p.playerId} style={styles.nextActionsPlayerBlock}>
              <Text style={styles.nextActionsPlayerName}>{p.playerName}</Text>
              {p.actions.map((a, i) => (
                <Text key={`${p.playerId}-a-${i}`} style={styles.nextActionsLine}>
                  • {a}
                </Text>
              ))}
            </View>
          ))}
        </>
      ) : null}
      {next.nextTrainingFocus.length > 0 ? (
        <>
          <Text
            style={[
              styles.nextActionsSubkicker,
              (next.team.length > 0 || next.players.length > 0) && { marginTop: 10 },
            ]}
          >
            Следующий акцент тренировки
          </Text>
          {next.nextTrainingFocus.map((line, i) => (
            <Text key={`na-ntf-${i}`} style={styles.nextActionsLine}>
              • {line}
            </Text>
          ))}
          <Text style={styles.arenaNtfScheduleHint}>
            Чтобы перенести это в расписание — используйте блок ниже
          </Text>
        </>
      ) : null}

      {showMeaningTaskRows ? (
        <>
          <View style={styles.arenaActionsDivider} />
          <Text style={styles.arenaActionSectionTitle}>Действия</Text>
          <Text style={styles.arenaActionMicroMuted}>Появится в созданных задачах</Text>
          <ReportDraftMeaningFollowUpTaskRow liveSessionId={liveSessionId} next={next} />
          <ReportDraftPlayerMeaningFollowUpRow liveSessionId={liveSessionId} next={next} />
        </>
      ) : null}
    </SectionCard>
  );
}

function progressHeadlineForKind(p: "improved" | "no_change" | "regressed"): string {
  if (p === "improved") return "Есть прогресс";
  if (p === "regressed") return "Требует внимания";
  return "Без изменений";
}

function arenaRecommendationKindRu(k: LiveTrainingSessionMeaningActionTriggerV1["type"]): string {
  if (k === "extra_training") return "Доп. работа";
  if (k === "attention_required") return "Внимание";
  return "Прогресс";
}

function ReportDraftArenaRecommendationsBlock({
  items,
  router,
  players,
}: {
  items: LiveTrainingSessionMeaningActionTriggerV1[];
  router: ReturnType<typeof useRouter>;
  players: LiveTrainingCoachView["players"];
}) {
  if (items.length === 0) return null;
  const nameById = new Map(players.map((p) => [p.playerId, p.playerName]));
  return (
    <SectionCard elevated style={styles.card}>
      <Text style={styles.kicker}>Арена рекомендует</Text>
      <Text style={styles.arenaRecDisclaimer}>
        Фиксация решения Арены по смыслу сессии. Задачи и сообщения не создаются автоматически.
      </Text>
      {items.map((t, i) => (
        <View key={`ar-${i}`} style={styles.arenaRecRow}>
          <Text style={styles.arenaRecKind}>{arenaRecommendationKindRu(t.type)}</Text>
          {t.target === "team" ? (
            <Text style={styles.arenaRecTarget}>Команда</Text>
          ) : t.playerId ? (
            <Pressable
              onPress={() =>
                router.push(
                  `/player/${encodeURIComponent(t.playerId!)}` as Parameters<typeof router.push>[0]
                )
              }
            >
              <Text style={styles.arenaRecPlayerLink}>{nameById.get(t.playerId) ?? "Игрок"}</Text>
            </Pressable>
          ) : (
            <Text style={styles.arenaRecTarget}>Игрок</Text>
          )}
          <Text style={styles.nextActionsLine}>{t.reason}</Text>
        </View>
      ))}
    </SectionCard>
  );
}

function normalizeSuggestedActionPlayerId(playerId: string | undefined | null): string | null {
  if (playerId == null || String(playerId).trim() === "") return null;
  return String(playerId).trim();
}

function findExternalCoachRecommendationRow(
  recs: LiveTrainingExternalCoachRecommendationRow[],
  externalCoachId: string,
  actionPlayerId: string | undefined | null
): LiveTrainingExternalCoachRecommendationRow | undefined {
  const p = normalizeSuggestedActionPlayerId(actionPlayerId);
  return recs.find(
    (r) => r.externalCoachId === externalCoachId && normalizeSuggestedActionPlayerId(r.playerId) === p
  );
}

function ReportDraftExternalCoachFeedbackBlock({
  recommendationId,
  onAfterSave,
}: {
  recommendationId: string;
  onAfterSave: () => void | Promise<void>;
}) {
  const [summary, setSummary] = useState("");
  const [focusJoined, setFocusJoined] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getLiveTrainingExternalCoachFeedback(recommendationId)
      .then((fb) => {
        if (cancelled || !fb) return;
        setSummary(fb.summary);
        setFocusJoined(fb.focusAreas.length ? fb.focusAreas.join("; ") : "");
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [recommendationId]);

  if (loading) {
    return (
      <View style={styles.externalCoachFeedbackWrap}>
        <Text style={styles.mutedLine}>Загрузка отзыва…</Text>
      </View>
    );
  }

  return (
    <View style={styles.externalCoachFeedbackWrap}>
      <Text style={styles.externalCoachFeedbackKicker}>Отзыв о внешней работе</Text>
      <Text style={styles.arenaRecDisclaimer}>
        Кратко зафиксируйте результат; данные попадут в старт следующей live-тренировки команды.
      </Text>
      <TextInput
        value={summary}
        onChangeText={setSummary}
        placeholder="Краткое резюме"
        placeholderTextColor={theme.colors.textMuted}
        multiline
        style={styles.externalCoachFeedbackInput}
      />
      <TextInput
        value={focusJoined}
        onChangeText={setFocusJoined}
        placeholder="Фокусы через точку с запятой (до 8)"
        placeholderTextColor={theme.colors.textMuted}
        style={styles.externalCoachFeedbackInputSingle}
      />
      {err ? <Text style={styles.externalCoachActionError}>{err}</Text> : null}
      {ok ? <Text style={styles.narrativeSaveOk}>Сохранено</Text> : null}
      <PrimaryButton
        title={saving ? "Сохранение…" : "Сохранить отзыв"}
        onPress={() => {
          void (async () => {
            setErr(null);
            setOk(false);
            setSaving(true);
            try {
              const areas = focusJoined
                .split(/[;,]/u)
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 8);
              await saveLiveTrainingExternalCoachFeedback(recommendationId, summary.trim(), areas);
              setOk(true);
              await onAfterSave();
            } catch (e) {
              if (e instanceof ApiRequestError) {
                setErr(e.message);
              } else {
                setErr("Не удалось сохранить.");
              }
            } finally {
              setSaving(false);
            }
          })();
        }}
        disabled={saving || !summary.trim()}
        style={styles.externalCoachFeedbackSaveBtn}
        animatedPress
      />
    </View>
  );
}

function ReportDraftSuggestedCoachActionsBlock({
  items,
  liveSessionId,
  recommendations,
  onAfterMutation,
}: {
  items: LiveTrainingSessionMeaningSuggestedCoachV1[];
  liveSessionId: string;
  recommendations: LiveTrainingExternalCoachRecommendationRow[];
  onAfterMutation: () => void | Promise<void>;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <SectionCard elevated style={styles.card}>
      <Text style={styles.kicker}>Предлагаемые действия</Text>
      <Text style={styles.arenaRecDisclaimer}>
        Текст кнопок — ориентир; на этом шаге действия в системе не выполняются.
      </Text>
      {actionError ? <Text style={styles.externalCoachActionError}>{actionError}</Text> : null}
      {items.map((a, i) => (
        <View key={`sug-${i}`} style={styles.suggestedActionRow}>
          <Text style={styles.suggestedActionTitle}>{a.title}</Text>
          <Text style={styles.nextActionsLine}>{a.description}</Text>
          <PrimaryButton title={a.cta} onPress={() => {}} disabled style={styles.suggestedActionCta} />
          {a.recommendedCoaches && a.recommendedCoaches.length > 0 ? (
            <View style={styles.suggestedExternalCoaches}>
              <Text style={styles.suggestedExternalKicker}>Подбор внешних тренеров</Text>
              {a.recommendedCoaches.map((c) => {
                const rec = findExternalCoachRecommendationRow(recommendations, c.id, a.playerId);
                if (rec?.status === "dismissed") return null;
                const rowKey = `${c.id}:${normalizeSuggestedActionPlayerId(a.playerId) ?? ""}`;
                const busy = busyKey === rowKey;
                const skillsLine = (c.skills ?? []).join(" · ");
                const isConfirmed = rec?.status === "confirmed";
                return (
                  <View key={c.id} style={styles.suggestedExternalRow}>
                    <Text style={styles.suggestedExternalName}>{c.name}</Text>
                    {skillsLine ? (
                      <Text style={styles.suggestedExternalSkills}>{skillsLine}</Text>
                    ) : null}
                    {isConfirmed ? (
                      <>
                        <Text style={styles.suggestedExternalConfirmed}>Подбор подтверждён</Text>
                        {rec?.id ? (
                          <ReportDraftExternalCoachFeedbackBlock
                            recommendationId={rec.id}
                            onAfterSave={onAfterMutation}
                          />
                        ) : null}
                      </>
                    ) : (
                      <View style={styles.suggestedExternalActionsRow}>
                        <PrimaryButton
                          title={busy ? "…" : "Подтвердить"}
                          onPress={() => {
                            void (async () => {
                              setActionError(null);
                              setBusyKey(rowKey);
                              try {
                                await confirmLiveTrainingExternalCoachRecommendation(
                                  liveSessionId,
                                  c.id,
                                  normalizeSuggestedActionPlayerId(a.playerId)
                                );
                                await onAfterMutation();
                              } catch (e) {
                                if (e instanceof ApiRequestError) {
                                  setActionError(e.message);
                                } else {
                                  setActionError("Не удалось подтвердить.");
                                }
                              } finally {
                                setBusyKey(null);
                              }
                            })();
                          }}
                          disabled={busy}
                          style={styles.suggestedExternalActionBtn}
                          animatedPress
                        />
                        <PrimaryButton
                          title={busy ? "…" : "Скрыть"}
                          variant="outline"
                          onPress={() => {
                            void (async () => {
                              setActionError(null);
                              if (!rec?.id) {
                                setActionError("Обновите экран и попробуйте снова.");
                                return;
                              }
                              setBusyKey(rowKey);
                              try {
                                await dismissLiveTrainingExternalCoachRecommendation(liveSessionId, rec.id);
                                await onAfterMutation();
                              } catch (e) {
                                if (e instanceof ApiRequestError) {
                                  setActionError(e.message);
                                } else {
                                  setActionError("Не удалось скрыть.");
                                }
                              } finally {
                                setBusyKey(null);
                              }
                            })();
                          }}
                          disabled={busy}
                          style={styles.suggestedExternalActionBtn}
                          animatedPress
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      ))}
    </SectionCard>
  );
}

function externalWorkImpactStatusRu(s: LiveTrainingExternalWorkImpactRowV1["status"]): string {
  if (s === "helped") return "Помогло";
  if (s === "no_clear_effect") return "Эффект неочевиден";
  return "Нужно больше времени";
}

function ReportDraftExternalWorkImpactBlock({ rows }: { rows: LiveTrainingExternalWorkImpactRowV1[] }) {
  if (rows.length === 0) return null;
  return (
    <SectionCard elevated style={styles.card}>
      <Text style={styles.kicker}>Как сработала внешняя работа</Text>
      {rows.map((r, i) => (
        <View key={`ewi-${r.playerId ?? "team"}-${i}`} style={styles.nextActionsPlayerBlock}>
          <Text style={styles.nextActionsPlayerName}>{r.playerName}</Text>
          <Text style={styles.progressBadge}>{externalWorkImpactStatusRu(r.status)}</Text>
          <Text style={styles.nextActionsLine}>{r.note}</Text>
        </View>
      ))}
    </SectionCard>
  );
}

function ReportDraftProgressBlock({
  prog,
  router,
}: {
  prog: LiveTrainingSessionMeaningProgressV1;
  router: ReturnType<typeof useRouter>;
}) {
  const has = prog.team.length > 0 || prog.players.length > 0;
  if (!has) return null;
  return (
    <SectionCard elevated style={styles.card}>
      <Text style={styles.kicker}>Прогресс с прошлой тренировки</Text>
      {prog.team.length > 0 ? (
        <>
          <Text style={styles.nextActionsSubkicker}>Команде</Text>
          {prog.team.map((line, i) => (
            <Text key={`pr-team-${i}`} style={styles.nextActionsLine}>
              • {line}
            </Text>
          ))}
        </>
      ) : null}
      {prog.players.length > 0 ? (
        <>
          <Text
            style={[
              styles.nextActionsSubkicker,
              prog.team.length > 0 && { marginTop: 10 },
            ]}
          >
            Игроки в фокусе
          </Text>
          {prog.players.map((p) => (
            <View key={p.playerId} style={styles.nextActionsPlayerBlock}>
              <Pressable
                onPress={() =>
                  router.push(`/player/${encodeURIComponent(p.playerId)}` as Parameters<typeof router.push>[0])
                }
              >
                <Text style={styles.nextActionsPlayerName}>
                  {p.playerName}{" "}
                  <Text style={styles.progressBadge}>· {progressHeadlineForKind(p.progress)}</Text>
                </Text>
              </Pressable>
              {p.note.trim() ? (
                <Text style={styles.nextActionsLine}>{p.note.trim()}</Text>
              ) : null}
            </View>
          ))}
        </>
      ) : null}
    </SectionCard>
  );
}

function CoachPreviewNarrativeBlocks({
  narrative,
  router,
}: {
  narrative: LiveTrainingCoachPreviewNarrativeV1;
  router: ReturnType<typeof useRouter>;
}) {
  const summaryLines = narrative.sessionSummaryLines.filter((s) => s.trim().length > 0);
  const focus = narrative.focusAreas.filter((s) => s.trim().length > 0);
  const ph = narrative.playerHighlights.filter((h) => h.text.trim().length > 0);
  return (
    <>
      {summaryLines.length > 0 ? (
        <SectionCard elevated style={styles.card}>
          <Text style={styles.kicker}>Сводка черновика</Text>
          {summaryLines.map((line, i) => (
            <Text key={`ns-${i}`} style={styles.narrativeParagraph}>
              {line}
            </Text>
          ))}
        </SectionCard>
      ) : null}
      {focus.length > 0 ? (
        <SectionCard elevated style={styles.card}>
          <Text style={styles.kicker}>Фокус и зоны внимания</Text>
          {focus.map((line, i) => (
            <Text key={`fa-${i}`} style={styles.narrativeBullet}>
              • {line}
            </Text>
          ))}
        </SectionCard>
      ) : null}
      {ph.length > 0 ? (
        <SectionCard elevated style={styles.card}>
          <Text style={styles.kicker}>Акценты по игрокам</Text>
          {ph.map((h, i) => (
            <View key={`phn-${i}`} style={styles.playerBlock}>
              {h.playerId ? (
                <Pressable
                  onPress={() =>
                    router.push(`/player/${encodeURIComponent(h.playerId!)}` as Parameters<typeof router.push>[0])
                  }
                >
                  <Text style={styles.playerName}>{h.playerName ?? "Игрок"}</Text>
                </Pressable>
              ) : (
                <Text style={styles.bodyLine}>{h.playerName ?? "Игрок"}</Text>
              )}
              <Text style={styles.mutedLine}>{h.text}</Text>
            </View>
          ))}
        </SectionCard>
      ) : null}
    </>
  );
}

const MAX_FOCUS_EDIT_ROWS = 10;
const MAX_PLAYER_HIGHLIGHT_EDIT_ROWS = 15;

function CoachNarrativeEditor({
  value,
  onChange,
}: {
  value: LiveTrainingCoachPreviewNarrativeV1;
  onChange: (next: LiveTrainingCoachPreviewNarrativeV1) => void;
}) {
  const summaryJoined = value.sessionSummaryLines.join("\n");
  return (
    <>
      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Сводка черновика</Text>
        <Text style={styles.fieldHint}>Каждая строка — отдельное предложение</Text>
        <TextInput
          style={styles.textInputMultiline}
          multiline
          value={summaryJoined}
          onChangeText={(t) =>
            onChange({
              ...value,
              sessionSummaryLines: t.split("\n").map((l) => l.replace(/\s+$/u, "")),
            })
          }
          placeholder="Нейтральные формулировки по сессии…"
          placeholderTextColor={theme.colors.textMuted}
        />
      </SectionCard>
      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Фокус и зоны внимания</Text>
        {value.focusAreas.map((line, i) => (
          <View key={`fa-ed-${i}`} style={styles.editRow}>
            <TextInput
              style={styles.textInputSingle}
              value={line}
              onChangeText={(t) => {
                const next = [...value.focusAreas];
                next[i] = t;
                onChange({ ...value, focusAreas: next });
              }}
              placeholder={`Фокус ${i + 1}`}
              placeholderTextColor={theme.colors.textMuted}
            />
            <Pressable
              onPress={() => onChange({ ...value, focusAreas: value.focusAreas.filter((_, j) => j !== i) })}
              style={({ pressed }) => [styles.removeChip, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.removeChipText}>✕</Text>
            </Pressable>
          </View>
        ))}
        {value.focusAreas.length < MAX_FOCUS_EDIT_ROWS ? (
          <Pressable
            onPress={() => onChange({ ...value, focusAreas: [...value.focusAreas, ""] })}
            style={({ pressed }) => [styles.addLineBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.addLineBtnText}>+ Добавить строку фокуса</Text>
          </Pressable>
        ) : null}
      </SectionCard>
      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Акценты по игрокам</Text>
        {value.playerHighlights.map((h, i) => (
          <View key={`ph-ed-${i}`} style={styles.highlightEditBlock}>
            <TextInput
              style={styles.textInputSingle}
              value={h.playerName ?? ""}
              onChangeText={(t) => {
                const next = [...value.playerHighlights];
                const cur = next[i]!;
                next[i] = { ...cur, playerName: t.trim() ? t : null };
                onChange({ ...value, playerHighlights: next });
              }}
              placeholder="Имя игрока"
              placeholderTextColor={theme.colors.textMuted}
            />
            <TextInput
              style={[styles.textInputSingle, styles.mtSm]}
              value={typeof h.playerId === "string" ? h.playerId : ""}
              onChangeText={(t) => {
                const next = [...value.playerHighlights];
                const cur = next[i]!;
                next[i] = { ...cur, playerId: t.trim() ? t.trim() : null };
                onChange({ ...value, playerHighlights: next });
              }}
              placeholder="ID игрока (опционально)"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.textInputMultiline, styles.mtSm]}
              multiline
              value={h.text}
              onChangeText={(t) => {
                const next = [...value.playerHighlights];
                const cur = next[i]!;
                next[i] = { ...cur, text: t };
                onChange({ ...value, playerHighlights: next });
              }}
              placeholder="Текст акцента"
              placeholderTextColor={theme.colors.textMuted}
            />
            <Pressable
              onPress={() =>
                onChange({ ...value, playerHighlights: value.playerHighlights.filter((_, j) => j !== i) })
              }
              style={({ pressed }) => [styles.removeRowBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.removeRowBtnText}>Удалить строку</Text>
            </Pressable>
          </View>
        ))}
        {value.playerHighlights.length < MAX_PLAYER_HIGHLIGHT_EDIT_ROWS ? (
          <Pressable
            onPress={() =>
              onChange({
                ...value,
                playerHighlights: [...value.playerHighlights, { text: "", playerId: null, playerName: null }],
              })
            }
            style={({ pressed }) => [styles.addLineBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.addLineBtnText}>+ Добавить акцент по игроку</Text>
          </Pressable>
        ) : null}
      </SectionCard>
    </>
  );
}

function isAutoGeneratedParentMessage(s: string): boolean {
  return (
    /Краткий отчёт по тренировке/i.test(s) && /доступен в приложении/i.test(s)
  );
}

function MultilineReadOnlyText({ text, baseStyle }: { text: string; baseStyle: TextStyle }) {
  const lines = text.split(/\n/u).map((l) => l.trimEnd()).filter((l) => l.length > 0);
  if (lines.length <= 1) {
    return <Text style={baseStyle}>{text.trim()}</Text>;
  }
  return (
    <>
      {lines.map((line, i) => (
        <Text key={`ml-${i}`} style={[baseStyle, i > 0 && { marginTop: 6 }]}>
          {line}
        </Text>
      ))}
    </>
  );
}

function PublishedCoachFinalReportPanel({
  report,
  publishSuccess,
}: {
  report: LiveTrainingPublishedFinalReportRead;
  publishSuccess: boolean;
}) {
  const pubLabel =
    report.publishedAt && Date.parse(report.publishedAt)
      ? new Date(report.publishedAt).toLocaleString()
      : report.publishedAt;
  const updLabel =
    report.updatedAt && Date.parse(report.updatedAt)
      ? new Date(report.updatedAt).toLocaleString()
      : report.updatedAt;
  const pm = report.parentMessage?.trim() ?? "";
  const pmIsAuto = pm.length > 0 && isAutoGeneratedParentMessage(pm);
  const hasSummary = Boolean(report.summary?.trim());
  const hasFocus = Boolean(report.focusAreas?.trim());
  const hasCoach = Boolean(report.coachNote?.trim());
  const hasPm = pm.length > 0;

  return (
    <>
      <SectionCard elevated style={styles.publishedFinalHeroCard}>
        <View style={styles.publishedFinalHeroTop}>
          <Text style={styles.publishedFinalTitle}>Итоговый отчёт</Text>
          <View style={styles.publishedPill}>
            <Text style={styles.publishedPillText}>Опубликовано</Text>
          </View>
        </View>
        {report.sessionLabel ? (
          <Text style={styles.publishedSessionLabel} numberOfLines={3}>
            {report.sessionLabel}
          </Text>
        ) : null}
        <Text style={styles.publishedMetaLine}>
          {pubLabel ? `Подтверждение: ${pubLabel}` : "Дата публикации не указана"}
          {updLabel ? ` · обновлено в CRM: ${updLabel}` : ""}
        </Text>
        {publishSuccess ? (
          <>
            <Text style={styles.narrativeSaveOk}>Отчёт успешно подтверждён и сохранён в расписании.</Text>
            <Text style={styles.publishedParentHint}>
              Родители увидят опубликованные поля отчёта в профиле ребёнка в приложении.
            </Text>
          </>
        ) : null}
      </SectionCard>

      {hasSummary ? (
        <SectionCard elevated style={styles.card}>
          <Text style={styles.finalSectionKicker}>Сводка</Text>
          <MultilineReadOnlyText text={report.summary!.trim()} baseStyle={styles.finalSectionBody} />
        </SectionCard>
      ) : null}

      {hasFocus ? (
        <SectionCard elevated style={styles.card}>
          <Text style={styles.finalSectionKicker}>Фокус и зоны внимания</Text>
          <MultilineReadOnlyText text={report.focusAreas!.trim()} baseStyle={styles.finalSectionBody} />
        </SectionCard>
      ) : null}

      {hasCoach ? (
        <SectionCard elevated style={styles.card}>
          <Text style={styles.finalSectionKicker}>Заметка тренера</Text>
          <MultilineReadOnlyText text={report.coachNote!.trim()} baseStyle={styles.finalSectionBody} />
        </SectionCard>
      ) : null}

      {hasPm ? (
        <SectionCard elevated style={styles.card}>
          <Text style={styles.finalSectionKicker}>Сообщение для родителей</Text>
          <MultilineReadOnlyText
            text={pm}
            baseStyle={pmIsAuto ? styles.finalParentMessageAuto : styles.finalSectionBody}
          />
        </SectionCard>
      ) : null}

      {!hasSummary && !hasFocus && !hasCoach && !hasPm ? (
        <SectionCard elevated style={styles.card}>
          <Text style={styles.mutedLine}>
            Текстовые поля отчёта в CRM пусты. При необходимости отредактируйте отчёт в карточке тренировки в
            расписании.
          </Text>
        </SectionCard>
      ) : null}
    </>
  );
}

function CoachAudiencePreview({
  v,
  router,
  draftStatus,
  publishedFinalReport,
  narrativeEdit,
  onChangeNarrative,
  onSaveNarrative,
  saving,
  saveError,
  saveOk,
  onPublishReport,
  publishBusy,
  publishError,
  publishSuccess,
  liveSessionId,
  externalCoachRecommendations,
  onRefreshExternalCoachRecommendations,
  publishToScheduleBlocked,
  teamBehaviorContextLine,
  arenaNextTrainingFocusApply,
  onApplyArenaNextTrainingFocus,
  arenaNextFocusApplyBusy,
  arenaNextFocusApplyError,
}: {
  v: LiveTrainingCoachView;
  router: ReturnType<typeof useRouter>;
  draftStatus: string;
  publishedFinalReport: LiveTrainingPublishedFinalReportRead | null;
  narrativeEdit: LiveTrainingCoachPreviewNarrativeV1;
  onChangeNarrative: (n: LiveTrainingCoachPreviewNarrativeV1) => void;
  onSaveNarrative: () => void;
  saving: boolean;
  saveError: string | null;
  saveOk: boolean;
  onPublishReport: () => void;
  publishBusy: boolean;
  publishError: string | null;
  publishSuccess: boolean;
  liveSessionId: string;
  externalCoachRecommendations: LiveTrainingExternalCoachRecommendationRow[];
  onRefreshExternalCoachRecommendations: () => void | Promise<void>;
  publishToScheduleBlocked: boolean;
  /** GET trainings/:id/behavioral-suggestions, агрегат по команде; только контекст. */
  teamBehaviorContextLine: string | null;
  arenaNextTrainingFocusApply: ArenaNextTrainingFocusApplyState;
  onApplyArenaNextTrainingFocus: () => void;
  arenaNextFocusApplyBusy: boolean;
  arenaNextFocusApplyError: string | null;
}) {
  const meta = v.sessionMeta;
  return (
    <>
      {draftStatus === "ready" && publishedFinalReport ? (
        <PublishedCoachFinalReportPanel report={publishedFinalReport} publishSuccess={publishSuccess} />
      ) : draftStatus === "ready" && !publishedFinalReport ? (
        <SectionCard elevated style={styles.card}>
          <Text style={styles.kicker}>Статус</Text>
          <Text style={styles.publishedBadge}>Опубликовано</Text>
          <Text style={styles.mutedLine}>
            Итоговый текст из CRM не загружен (нет привязки к тренировке в расписании или нет доступа). Проверьте
            отчёт в карточке тренировки в расписании.
          </Text>
          {publishSuccess ? (
            <>
              <Text style={[styles.narrativeSaveOk, { marginTop: 8 }]}>Подтверждение сохранено.</Text>
              <Text style={styles.publishedParentHint}>
                Родители увидят опубликованные поля отчёта в профиле ребёнка в приложении.
              </Text>
            </>
          ) : null}
        </SectionCard>
      ) : null}
      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Сессия (операционно)</Text>
        <Text style={styles.bodyLine}>{meta.teamName}</Text>
        <Text style={styles.mutedLine}>Режим: {formatLiveTrainingMode(meta.mode as "ice" | "ofp" | "mixed")}</Text>
        <Text style={styles.mutedLine}>Старт: {new Date(meta.startedAt).toLocaleString()}</Text>
        {meta.endedAt ? (
          <Text style={styles.mutedLine}>Завершение: {new Date(meta.endedAt).toLocaleString()}</Text>
        ) : null}
        {meta.confirmedAt ? (
          <Text style={styles.mutedLine}>Подтверждено: {new Date(meta.confirmedAt).toLocaleString()}</Text>
        ) : null}
      </SectionCard>

      {v.nextActions ? (
        <ReportDraftNextActionsBlock next={v.nextActions} liveSessionId={liveSessionId} />
      ) : null}

      {arenaNextTrainingFocusApply.focusLineFromMeaning ? (
        <ReportDraftArenaNextTrainingFocusApplyBlock
          focusLine={arenaNextTrainingFocusApply.focusLineFromMeaning}
          apply={arenaNextTrainingFocusApply}
          onApply={onApplyArenaNextTrainingFocus}
          busy={arenaNextFocusApplyBusy}
          errorText={arenaNextFocusApplyError}
        />
      ) : null}

      {v.sessionProgress ? <ReportDraftProgressBlock prog={v.sessionProgress} router={router} /> : null}

      {v.externalWorkImpactV1 && v.externalWorkImpactV1.length > 0 ? (
        <ReportDraftExternalWorkImpactBlock rows={v.externalWorkImpactV1} />
      ) : null}

      {v.arenaRecommendations && v.arenaRecommendations.length > 0 ? (
        <ReportDraftArenaRecommendationsBlock
          items={v.arenaRecommendations}
          router={router}
          players={v.players}
        />
      ) : null}

      {v.suggestedActions && v.suggestedActions.coach.length > 0 ? (
        <ReportDraftSuggestedCoachActionsBlock
          items={v.suggestedActions.coach}
          liveSessionId={liveSessionId}
          recommendations={externalCoachRecommendations}
          onAfterMutation={onRefreshExternalCoachRecommendations}
        />
      ) : null}

      {draftStatus === "draft" ? (
        <>
          {teamBehaviorContextLine ? (
            <Text style={styles.teamBehaviorContextLine}>{teamBehaviorContextLine}</Text>
          ) : null}
          <CoachNarrativeEditor value={narrativeEdit} onChange={onChangeNarrative} />
          <PrimaryButton
            title={saving ? "Сохранение…" : "Сохранить черновик"}
            onPress={onSaveNarrative}
            disabled={saving || publishBusy}
            style={styles.narrativeSaveButton}
          />
          {saveError ? <Text style={styles.narrativeSaveError}>{saveError}</Text> : null}
          {saveOk ? <Text style={styles.narrativeSaveOk}>Черновик сохранён</Text> : null}
          {publishToScheduleBlocked ? (
            <Text style={styles.narrativeSaveError}>
              Нет привязки к тренировке в расписании. Начните живую тренировку из слота в расписании команды — без
              этого отчёт нельзя перенести в CRM.
            </Text>
          ) : null}
          <PrimaryButton
            title={publishBusy ? "Публикация…" : "Подтвердить отчёт"}
            onPress={onPublishReport}
            disabled={
              publishBusy ||
              saving ||
              !hasCoachNarrativeContent(narrativeEdit) ||
              publishToScheduleBlocked
            }
            style={styles.publishButton}
          />
          {publishError ? <Text style={styles.narrativeSaveError}>{publishError}</Text> : null}
        </>
      ) : draftStatus === "draft" && hasCoachNarrativeContent(v.coachPreviewNarrativeV1) ? (
        <CoachPreviewNarrativeBlocks narrative={v.coachPreviewNarrativeV1!} router={router} />
      ) : null}

      {v.internalReminders.length > 0 ? (
        <SectionCard elevated style={styles.card}>
          <Text style={styles.kicker}>Внутренние напоминания</Text>
          {v.internalReminders.map((line, i) => (
            <Text key={`ir-${i}`} style={styles.reminderLine}>
              {line}
            </Text>
          ))}
        </SectionCard>
      ) : null}

      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Счётчики</Text>
        <Text style={styles.bodyLine}>Наблюдений (включённые): {v.counters.includedDraftsCount}</Text>
        <Text style={styles.bodyLine}>Сигналов: {v.counters.signalsCreatedCount}</Text>
        <Text style={styles.bodyLine}>Игроков с сигналами: {v.counters.affectedPlayersCount}</Text>
        <Text style={styles.mutedLine}>
          Плюс: {v.counters.positiveSignalsCount} · Внимание: {v.counters.negativeSignalsCount} · Нейтрально:{" "}
          {v.counters.neutralSignalsCount}
        </Text>
        {v.counters.excludedDraftsCount > 0 ? (
          <Text style={styles.mutedLine}>Исключено из сессии: {v.counters.excludedDraftsCount}</Text>
        ) : null}
        {v.counters.draftsFlaggedNeedsReview > 0 ? (
          <Text style={styles.mutedLine}>Пометка «проверка»: {v.counters.draftsFlaggedNeedsReview}</Text>
        ) : null}
      </SectionCard>

      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Фокус (домены)</Text>
        {v.focusDomains.length > 0 ? (
          <Text style={styles.bodyLine}>
            {v.focusDomains.map((d) => formatLiveTrainingMetricDomain(d)).join(" · ")}
          </Text>
        ) : (
          <Text style={styles.empty}>Нет доменов.</Text>
        )}
      </SectionCard>

      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Игроки</Text>
        {v.players.length > 0 ? (
          v.players.map((p) => (
            <View key={p.playerId} style={styles.playerBlock}>
              <Pressable
                onPress={() =>
                  router.push(`/player/${encodeURIComponent(p.playerId)}` as Parameters<typeof router.push>[0])
                }
              >
                <Text style={styles.playerName}>{p.playerName}</Text>
              </Pressable>
              <Text style={styles.mutedLine}>
                Сигналов: {p.totalSignals} · +{p.positiveCount} / −{p.negativeCount} / ○{p.neutralCount}
              </Text>
              {p.topDomains.length > 0 ? (
                <Text style={styles.domainHint}>
                  {p.topDomains.map((d) => formatLiveTrainingMetricDomain(d)).join(" · ")}
                </Text>
              ) : null}
              {p.evidence.length > 0 ? (
                <View style={styles.evidenceBox}>
                  {p.evidence.map((ev, i) => (
                    <Text key={`${p.playerId}-${i}`} style={styles.evidenceLine}>
                      <Text style={styles.evidenceDir}>{directionLabel(ev.direction)}</Text>{" "}
                      {formatLiveTrainingMetricDomain(ev.domain)}: {ev.text}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Нет игроков с сигналами.</Text>
        )}
      </SectionCard>

      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Требует внимания</Text>
        {v.notes.needsAttention.length > 0 ? (
          v.notes.needsAttention.map((n, i) => (
            <Text key={`na-${i}`} style={styles.noteLine}>
              <Text style={styles.noteWho}>{n.playerName ?? "—"}: </Text>
              {n.text}
            </Text>
          ))
        ) : (
          <Text style={styles.empty}>Пусто.</Text>
        )}
      </SectionCard>

      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Позитивные акценты</Text>
        {v.notes.positives.length > 0 ? (
          v.notes.positives.map((n, i) => (
            <Text key={`pos-${i}`} style={styles.noteLine}>
              <Text style={styles.noteWho}>{n.playerName ?? "—"}: </Text>
              {n.text}
            </Text>
          ))
        ) : (
          <Text style={styles.empty}>Пусто.</Text>
        )}
      </SectionCard>
    </>
  );
}

function ParentAudiencePreview({
  v,
  router,
}: {
  v: LiveTrainingParentView;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <>
      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>О тренировке</Text>
        <Text style={styles.bodyLine}>{v.sessionMeta.teamLabel}</Text>
        <Text style={styles.mutedLine}>{v.sessionMeta.modeLabel}</Text>
        <Text style={styles.mutedLine}>{v.sessionMeta.dateLabel}</Text>
        {v.progressHeadlineRu ? (
          <Text style={[styles.bodyLine, { marginTop: 10 }]}>{v.progressHeadlineRu}</Text>
        ) : null}
      </SectionCard>

      {v.arenaSafeRecommendations && v.arenaSafeRecommendations.length > 0 ? (
        <SectionCard elevated style={styles.card}>
          <Text style={styles.kicker}>Арена отмечает</Text>
          <Text style={styles.mutedLine}>
            Короткий ориентир по сильному прогрессу; без автоматических действий.
          </Text>
          {v.arenaSafeRecommendations.map((t, i) => (
            <Text key={`asr-${i}`} style={[styles.parentBullet, { marginTop: i === 0 ? 6 : 4 }]}>
              • {t.reason}
            </Text>
          ))}
        </SectionCard>
      ) : null}

      {v.suggestedParentActions && v.suggestedParentActions.length > 0 ? (
        <SectionCard elevated style={styles.card}>
          <Text style={styles.kicker}>Что можно сделать сейчас</Text>
          <Text style={styles.mutedLine}>Мягкие ориентиры при сильном прогрессе; без автодействий.</Text>
          {v.suggestedParentActions.map((a, i) => (
            <View key={`spa-${i}`} style={{ marginTop: i === 0 ? 8 : 10 }}>
              <Text style={styles.bodyLine}>{a.title}</Text>
              <Text style={styles.parentBullet}>• {a.description}</Text>
            </View>
          ))}
        </SectionCard>
      ) : null}

      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Общее</Text>
        {v.overviewLines.length > 0 ? (
          v.overviewLines.map((line, i) => (
            <Text key={`ov-${i}`} style={styles.parentBullet}>
              • {line}
            </Text>
          ))
        ) : (
          <Text style={styles.empty}>Нет краткого описания.</Text>
        )}
      </SectionCard>

      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Что получилось хорошо</Text>
        {v.highlights.length > 0 ? (
          v.highlights.map((line, i) => (
            <Text key={`hi-${i}`} style={styles.parentBullet}>
              • {line}
            </Text>
          ))
        ) : (
          <Text style={styles.empty}>Пока без отдельных акцентов.</Text>
        )}
      </SectionCard>

      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>На чём сфокусироваться дальше</Text>
        {v.developmentFocus.length > 0 ? (
          v.developmentFocus.map((line, i) => (
            <Text key={`df-${i}`} style={styles.parentBullet}>
              • {line}
            </Text>
          ))
        ) : (
          <Text style={styles.empty}>Отдельных зон внимания не выделено.</Text>
        )}
      </SectionCard>

      {v.parentActions && v.parentActions.length > 0 ? (
        <SectionCard elevated style={styles.card}>
          <Text style={styles.kicker}>Как помочь сейчас (родитель)</Text>
          <Text style={styles.mutedLine}>
            Формулировки для дома / вне льда; без внутренних терминов тренера.
          </Text>
          {v.parentActions.map((row) => (
            <View key={row.playerId} style={styles.parentActionPlayerBlock}>
              <Text style={styles.parentActionPlayerName}>{row.playerName}</Text>
              {row.actions.slice(0, 3).map((a, i) => (
                <Text key={`${row.playerId}-pa-${i}`} style={styles.parentBullet}>
                  • {a}
                </Text>
              ))}
            </View>
          ))}
        </SectionCard>
      ) : null}

      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Кого и как поддержать</Text>
        {v.supportNotes.length > 0 ? (
          v.supportNotes.map((line, i) => (
            <Text key={`su-${i}`} style={styles.parentBullet}>
              • {line}
            </Text>
          ))
        ) : (
          <Text style={styles.empty}>Специальных рекомендаций нет.</Text>
        )}
      </SectionCard>

      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Кратко по игрокам</Text>
        {v.playerHighlights.length > 0 ? (
          v.playerHighlights.map((ph, i) => (
            <View key={`ph-${i}`} style={styles.playerBlock}>
              {ph.playerId ? (
                <Pressable
                  onPress={() =>
                    router.push(`/player/${encodeURIComponent(ph.playerId!)}` as Parameters<typeof router.push>[0])
                  }
                >
                  <Text style={styles.playerName}>{ph.playerName}</Text>
                </Pressable>
              ) : (
                <Text style={styles.bodyLine}>{ph.playerName}</Text>
              )}
              <Text style={styles.mutedLine}>{ph.summaryLine}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Нет персональных кратких выжимок.</Text>
        )}
      </SectionCard>
    </>
  );
}

function SchoolAudiencePreview({
  v,
  router,
}: {
  v: LiveTrainingSchoolView;
  router: ReturnType<typeof useRouter>;
}) {
  const meta = v.sessionMeta;
  return (
    <>
      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Итог по сессии</Text>
        {v.teamSummaryLines.map((line, i) => (
          <Text key={`ts-${i}`} style={styles.schoolLine}>
            {line}
          </Text>
        ))}
        <Text style={styles.mutedLine}>
          Старт: {new Date(meta.startedAt).toLocaleString()}
          {meta.confirmedAt ? ` · Подтверждено: ${new Date(meta.confirmedAt).toLocaleString()}` : ""}
        </Text>
      </SectionCard>

      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Темы / домены</Text>
        {v.focusDomains.length > 0 ? (
          <Text style={styles.bodyLine}>
            {v.focusDomains.map((d) => formatLiveTrainingMetricDomain(d)).join(" · ")}
          </Text>
        ) : (
          <Text style={styles.empty}>Нет выделенных тем.</Text>
        )}
      </SectionCard>

      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Операционные счётчики</Text>
        <Text style={styles.schoolLine}>Сигналов: {v.counters.signalsCreatedCount}</Text>
        <Text style={styles.schoolLine}>Игроков в фокусе: {v.counters.affectedPlayersCount}</Text>
        <Text style={styles.schoolLine}>Наблюдений в отчёте: {v.counters.includedDraftsCount}</Text>
        <Text style={styles.schoolLine}>
          Тональность: +{v.counters.positiveSignalsCount} / внимание {v.counters.negativeSignalsCount} / ○
          {v.counters.neutralSignalsCount}
        </Text>
        {v.counters.excludedDraftsCount > 0 ? (
          <Text style={styles.schoolLine}>Исключено из выгрузки: {v.counters.excludedDraftsCount}</Text>
        ) : null}
        {v.counters.draftsFlaggedNeedsReview > 0 ? (
          <Text style={styles.schoolLine}>Пометка проверки при фиксации: {v.counters.draftsFlaggedNeedsReview}</Text>
        ) : null}
      </SectionCard>

      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Игроки в фокусе</Text>
        {v.playersInFocus.length > 0 ? (
          v.playersInFocus.map((p) => (
            <View key={p.playerId} style={styles.playerBlock}>
              <Pressable
                onPress={() =>
                  router.push(`/player/${encodeURIComponent(p.playerId)}` as Parameters<typeof router.push>[0])
                }
              >
                <Text style={styles.playerName}>{p.playerName}</Text>
              </Pressable>
              <Text style={styles.mutedLine}>
                Сигналов: {p.totalSignals} · +{p.positiveCount} / −{p.negativeCount} / ○{p.neutralCount}
              </Text>
              {p.topDomains.length > 0 ? (
                <Text style={styles.domainHint}>
                  {p.topDomains.map((d) => formatLiveTrainingMetricDomain(d)).join(" · ")}
                </Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Нет игроков в операционном фокусе.</Text>
        )}
      </SectionCard>

      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Мониторинг</Text>
        {v.monitoringNotes.length > 0 ? (
          v.monitoringNotes.map((line, i) => (
            <Text key={`mn-${i}`} style={styles.schoolLine}>
              • {line}
            </Text>
          ))
        ) : (
          <Text style={styles.empty}>Заметок для мониторинга нет.</Text>
        )}
      </SectionCard>
    </>
  );
}

const TAB_LABELS: Record<AudienceTab, string> = {
  coach: "Тренер",
  parent: "Родитель",
  school: "Школа",
};

function arenaAutoParam(v: string | string[] | undefined): boolean {
  const raw = typeof v === "string" ? v : v?.[0];
  return raw === "1";
}

export default function LiveTrainingReportDraftScreen() {
  const params = useLocalSearchParams<{
    sessionId: string | string[];
    ltArenaAuto?: string | string[];
  }>();
  const router = useRouter();
  const sid = typeof params.sessionId === "string" ? params.sessionId : params.sessionId?.[0];
  const showArenaAutoExplain = arenaAutoParam(params.ltArenaAuto);
  const mountedRef = useRef(true);
  const sidRef = useRef(sid);
  sidRef.current = sid;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [payload, setPayload] = useState<LiveTrainingReportDraftPayload | null>(null);
  const [audience, setAudience] = useState<AudienceTab>("coach");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [narrativeEdit, setNarrativeEdit] = useState<LiveTrainingCoachPreviewNarrativeV1>(() => emptyCoachNarrative());
  const [narrativeSaving, setNarrativeSaving] = useState(false);
  const [narrativeSaveError, setNarrativeSaveError] = useState<string | null>(null);
  const [narrativeSaveOk, setNarrativeSaveOk] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [arenaExplainSession, setArenaExplainSession] = useState<LiveTrainingSession | null>(null);
  const [linkedSession, setLinkedSession] = useState<LiveTrainingSession | null>(null);
  const [teamBehaviorContextLine, setTeamBehaviorContextLine] = useState<string | null>(null);
  const [arenaNextFocusApplyBusy, setArenaNextFocusApplyBusy] = useState(false);
  const [arenaNextFocusApplyError, setArenaNextFocusApplyError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sid) return;
    const reqSid = sid;
    setLoading(true);
    setError(null);
    try {
      const [p, sess] = await Promise.all([
        getLiveTrainingReportDraft(reqSid),
        getLiveTrainingSession(reqSid),
      ]);
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      setPayload(p);
      setLinkedSession(sess);
    } catch (e) {
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      setPayload(null);
      setLinkedSession(null);
      if (e instanceof ApiRequestError) {
        if (e.status === 409) {
          setError("Черновик доступен только после подтверждения тренировки.");
        } else {
          setError(e.message);
        }
      } else {
        setError("Не удалось загрузить черновик.");
      }
    } finally {
      if (mountedRef.current && sidRef.current === reqSid) {
        setLoading(false);
      }
    }
  }, [sid]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const tid =
      typeof linkedSession?.trainingSessionId === "string"
        ? linkedSession.trainingSessionId.trim()
        : "";
    if (!tid) {
      setTeamBehaviorContextLine(null);
      return;
    }
    let cancelled = false;
    void getTrainingVoiceBehavioralSuggestions(tid)
      .then((vb) => {
        if (cancelled) return;
        const players = Array.isArray(vb.players) ? vb.players : [];
        setTeamBehaviorContextLine(
          buildReportTeamBehaviorContextLine(
            players,
            COACH_SESSION_DETAIL_COPY.liveReportDraftTeamBehaviorContextPrefix
          )
        );
      })
      .catch(() => {
        if (!cancelled) setTeamBehaviorContextLine(null);
      });
    return () => {
      cancelled = true;
    };
  }, [linkedSession?.trainingSessionId]);

  useEffect(() => {
    if (!showArenaAutoExplain) {
      setArenaExplainSession(null);
      return;
    }
    setArenaExplainSession(linkedSession);
  }, [showArenaAutoExplain, linkedSession]);

  const arenaExplainLines = useMemo(() => {
    if (!showArenaAutoExplain || !payload) return [];
    return buildLiveTrainingArenaAutoExplainLines({
      coachView: payload.audienceViews.coachView,
      priorityAlignmentReview: arenaExplainSession?.continuitySnapshot?.priorityAlignmentReview ?? null,
    });
  }, [showArenaAutoExplain, payload, arenaExplainSession]);

  useEffect(() => {
    if (!payload) return;
    setNarrativeEdit(cloneCoachNarrative(payload.audienceViews.coachView.coachPreviewNarrativeV1));
  }, [payload]);

  useEffect(() => {
    if (!narrativeSaveOk) return;
    const t = setTimeout(() => setNarrativeSaveOk(false), 2800);
    return () => clearTimeout(t);
  }, [narrativeSaveOk]);

  const publishReport = useCallback(async () => {
    if (!sid) return;
    setPublishBusy(true);
    setPublishError(null);
    setPublishSuccess(false);
    try {
      await saveReportDraftNarrative(sid, {
        coachPreviewNarrative: buildNarrativePatchBody(narrativeEdit),
      });
      const result = await publishLiveTrainingReportDraft(sid);
      if (!mountedRef.current || sidRef.current !== sid) return;
      setPayload({
        reportDraft: result.reportDraft,
        audienceViews: result.audienceViews,
        publishedFinalReport: result.publishedFinalReport ?? null,
        externalCoachRecommendations: result.externalCoachRecommendations ?? [],
        arenaNextTrainingFocusApply: result.arenaNextTrainingFocusApply,
      });
      setNarrativeEdit(cloneCoachNarrative(result.audienceViews.coachView.coachPreviewNarrativeV1));
      setPublishSuccess(true);
      setNarrativeSaveOk(false);
    } catch (e) {
      if (!mountedRef.current || sidRef.current !== sid) return;
      if (e instanceof ApiRequestError) {
        setPublishError(e.message);
      } else {
        setPublishError("Не удалось опубликовать отчёт.");
      }
    } finally {
      if (mountedRef.current && sidRef.current === sid) {
        setPublishBusy(false);
      }
    }
  }, [sid, narrativeEdit]);

  const saveNarrative = useCallback(async () => {
    if (!sid) return;
    setNarrativeSaving(true);
    setNarrativeSaveError(null);
    setNarrativeSaveOk(false);
    try {
      const next = await saveReportDraftNarrative(sid, {
        coachPreviewNarrative: buildNarrativePatchBody(narrativeEdit),
      });
      if (!mountedRef.current || sidRef.current !== sid) return;
      setPayload(next);
      setNarrativeSaveOk(true);
    } catch (e) {
      if (!mountedRef.current || sidRef.current !== sid) return;
      if (e instanceof ApiRequestError) {
        setNarrativeSaveError(e.message);
      } else {
        setNarrativeSaveError("Не удалось сохранить черновик.");
      }
    } finally {
      if (mountedRef.current && sidRef.current === sid) {
        setNarrativeSaving(false);
      }
    }
  }, [sid, narrativeEdit]);

  const applyArenaNextTrainingFocus = useCallback(async () => {
    if (!sid) return;
    setArenaNextFocusApplyBusy(true);
    setArenaNextFocusApplyError(null);
    try {
      const nextApply = await applyLiveTrainingArenaNextTrainingFocus(sid);
      if (!mountedRef.current || sidRef.current !== sid) return;
      setPayload((prev) =>
        prev ? { ...prev, arenaNextTrainingFocusApply: nextApply } : prev
      );
    } catch (e) {
      if (!mountedRef.current || sidRef.current !== sid) return;
      if (e instanceof ApiRequestError) {
        setArenaNextFocusApplyError(e.message);
      } else {
        setArenaNextFocusApplyError("Не удалось применить фокус.");
      }
    } finally {
      if (mountedRef.current && sidRef.current === sid) {
        setArenaNextFocusApplyBusy(false);
      }
    }
  }, [sid]);

  if (!sid) {
    return (
      <FlagshipScreen scroll={false}>
        <Text style={styles.error}>Некорректная ссылка</Text>
      </FlagshipScreen>
    );
  }

  if (loading) {
    return (
      <FlagshipScreen scroll={false} contentContainerStyle={styles.center}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={styles.muted}>Загрузка черновика…</Text>
      </FlagshipScreen>
    );
  }

  if (error || !payload) {
    return (
      <FlagshipScreen contentContainerStyle={styles.center}>
        <Text style={styles.error}>{error ?? "Нет данных"}</Text>
        <PrimaryButton title="Повторить" onPress={() => void load()} animatedPress />
        <PrimaryButton
          title="Назад"
          variant="outline"
          onPress={() => router.back()}
          animatedPress
          style={styles.btnGap}
        />
      </FlagshipScreen>
    );
  }

  const { reportDraft: draft, audienceViews: views } = payload;

  return (
    <FlagshipScreen contentContainerStyle={styles.content}>
      <Text style={styles.title}>{draft.title}</Text>
      <Text style={styles.statusPill}>
        Превью по аудиториям ·{" "}
        {draft.status === "ready"
          ? `опубликовано${draft.publishedAt ? ` · ${new Date(draft.publishedAt).toLocaleString()}` : ""}`
          : `черновик (${draft.status})`}
      </Text>
      <Text style={styles.coreRouteHint}>
        Экран опционален после подтверждения Live Training — основной поток: живой экран → проверка → подтверждение.
      </Text>

      {showArenaAutoExplain && arenaExplainLines.length > 0 ? (
        <SectionCard elevated style={styles.arenaExplainCard}>
          <Text style={styles.arenaExplainTitle}>Как сформирован отчёт</Text>
          <Text style={styles.arenaExplainSubtitle}>
            Арена: что учтено без ручной проверки (кратко).
          </Text>
          {arenaExplainLines.map((line, i) => (
            <Text key={`arena-ex-${i}`} style={styles.arenaExplainLine}>
              • {line}
            </Text>
          ))}
        </SectionCard>
      ) : null}

      <View style={styles.segmentWrap}>
        {(["coach", "parent", "school"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setAudience(tab)}
            style={({ pressed }) => [
              styles.segmentChip,
              audience === tab && styles.segmentChipActive,
              pressed && styles.segmentPressed,
            ]}
          >
            <Text style={[styles.segmentText, audience === tab && styles.segmentTextActive]}>
              {TAB_LABELS[tab]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.tabHint}>
        {audience === "coach"
          ? "Полные операционные данные для работы тренера."
          : audience === "parent"
            ? "Мягкая подача без внутренних пометок и служебных счётчиков."
            : "Краткий деловой срез для школы и CRM."}
      </Text>

      {audience === "coach" ? (
        <CoachAudiencePreview
          v={views.coachView}
          router={router}
          draftStatus={draft.status}
          publishedFinalReport={payload.publishedFinalReport}
          narrativeEdit={narrativeEdit}
          onChangeNarrative={setNarrativeEdit}
          onSaveNarrative={() => void saveNarrative()}
          saving={narrativeSaving}
          saveError={narrativeSaveError}
          saveOk={narrativeSaveOk}
          onPublishReport={() => void publishReport()}
          publishBusy={publishBusy}
          publishError={publishError}
          publishSuccess={publishSuccess}
          liveSessionId={sid}
          externalCoachRecommendations={payload.externalCoachRecommendations}
          onRefreshExternalCoachRecommendations={() => void load()}
          publishToScheduleBlocked={
            draft.status === "draft" && !hasCrmSlotLinkageForPublish(linkedSession)
          }
          teamBehaviorContextLine={teamBehaviorContextLine}
          arenaNextTrainingFocusApply={payload.arenaNextTrainingFocusApply}
          onApplyArenaNextTrainingFocus={() => void applyArenaNextTrainingFocus()}
          arenaNextFocusApplyBusy={arenaNextFocusApplyBusy}
          arenaNextFocusApplyError={arenaNextFocusApplyError}
        />
      ) : null}
      {audience === "parent" ? <ParentAudiencePreview v={views.parentView} router={router} /> : null}
      {audience === "school" ? <SchoolAudiencePreview v={views.schoolView} router={router} /> : null}

      {draft.status === "draft" ? (
        <Text style={styles.footerHint}>
          «Подтвердить отчёт» сохраняет ваш текст и переносит его в канонический отчёт по тренировке в расписании CRM.
          Превью по аудиториям остаётся без ИИ — только структура из фактов сессии.
        </Text>
      ) : null}

      <PrimaryButton
        title="На главную"
        onPress={() => router.replace("/(tabs)/arena" as Parameters<typeof router.replace>[0])}
        animatedPress
      />
      <PrimaryButton
        title="Назад к итогу"
        variant="outline"
        onPress={() => router.back()}
        animatedPress
        style={styles.btnGap}
      />
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.layout.screenBottom + theme.spacing.xl,
  },
  center: {
    alignItems: "center",
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  title: {
    ...theme.typography.title,
    fontSize: 20,
    marginBottom: theme.spacing.xs,
  },
  statusPill: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  arenaExplainCard: {
    marginBottom: theme.spacing.md,
  },
  arenaExplainTitle: {
    ...theme.typography.subtitle,
    fontSize: 16,
    marginBottom: theme.spacing.xs,
  },
  arenaExplainSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  arenaExplainLine: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  coreRouteHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  nextActionsSubkicker: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  nextActionsLine: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  nextActionsPlayerBlock: {
    marginBottom: theme.spacing.sm,
  },
  nextActionsPlayerName: {
    ...theme.typography.subtitle,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 2,
  },
  progressBadge: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  arenaRecDisclaimer: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 10,
    lineHeight: 17,
  },
  arenaRecRow: {
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  arenaRecKind: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.primary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  arenaRecTarget: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  arenaRecPlayerLink: {
    ...theme.typography.subtitle,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    marginBottom: 4,
  },
  suggestedActionRow: {
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  suggestedActionTitle: {
    ...theme.typography.subtitle,
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 6,
  },
  suggestedActionCta: {
    marginTop: 10,
    opacity: 0.85,
  },
  suggestedExternalCoaches: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  suggestedExternalKicker: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  suggestedExternalRow: {
    marginBottom: 8,
  },
  suggestedExternalName: {
    ...theme.typography.subtitle,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  suggestedExternalSkills: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  suggestedExternalConfirmed: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.primary,
    marginTop: 8,
  },
  suggestedExternalActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    alignItems: "center",
  },
  suggestedExternalActionBtn: {
    minWidth: 120,
  },
  externalCoachActionError: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.error,
    marginBottom: 8,
  },
  externalCoachFeedbackWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  externalCoachFeedbackKicker: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  externalCoachFeedbackInput: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 10,
    minHeight: 72,
    textAlignVertical: "top",
    marginBottom: 8,
  },
  externalCoachFeedbackInputSingle: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  externalCoachFeedbackSaveBtn: {
    marginTop: 4,
  },
  segmentWrap: {
    flexDirection: "row",
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  segmentChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: "center",
  },
  segmentChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  segmentPressed: {
    opacity: 0.88,
  },
  segmentText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontWeight: "600",
    textAlign: "center",
  },
  segmentTextActive: {
    color: theme.colors.primary,
  },
  tabHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  teamBehaviorContextLine: {
    ...theme.typography.caption,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  kicker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: theme.spacing.sm,
  },
  bodyLine: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: 4,
  },
  mutedLine: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 4,
    lineHeight: 18,
  },
  reminderLine: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  narrativeParagraph: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  narrativeBullet: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  publishedFinalHeroCard: {
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primaryMuted,
    backgroundColor: theme.colors.primaryMuted,
  },
  publishedFinalHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  publishedFinalTitle: {
    ...theme.typography.subtitle,
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    flex: 1,
  },
  publishedPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  publishedPillText: {
    ...theme.typography.caption,
    color: theme.colors.background,
    fontWeight: "700",
  },
  publishedSessionLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
  },
  publishedMetaLine: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  finalSectionKicker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: theme.spacing.sm,
  },
  finalSectionBody: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
  },
  finalParentMessageAuto: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 20,
    fontStyle: "italic",
  },
  fieldHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  textInputSingle: {
    ...theme.typography.body,
    flex: 1,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
  },
  textInputMultiline: {
    ...theme.typography.body,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 120,
    textAlignVertical: "top",
    backgroundColor: theme.colors.surface,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  removeChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  removeChipText: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  addLineBtn: {
    marginTop: theme.spacing.xs,
    paddingVertical: 8,
  },
  addLineBtnText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  highlightEditBlock: {
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  mtSm: {
    marginTop: theme.spacing.sm,
  },
  removeRowBtn: {
    marginTop: theme.spacing.sm,
    alignSelf: "flex-start",
  },
  removeRowBtnText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    fontWeight: "600",
  },
  narrativeSaveButton: {
    width: "100%",
    marginBottom: theme.spacing.sm,
  },
  arenaNextFocusApplyButton: {
    width: "100%",
    marginTop: theme.spacing.md,
  },
  meaningFollowUpTaskBlock: {
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  arenaActionSectionTitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontWeight: "700",
    letterSpacing: 0.35,
    textTransform: "uppercase",
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  arenaActionMicroMuted: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  arenaFocusMicroBelowKicker: {
    marginTop: theme.spacing.xs,
  },
  arenaNtfScheduleHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontStyle: "italic",
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  arenaActionsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.cardBorder,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  meaningFollowUpTaskLinkWrap: {
    alignSelf: "flex-start",
    marginTop: theme.spacing.sm,
  },
  meaningFollowUpTaskLink: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  playerMeaningFollowUpBlock: {
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  playerMeaningFollowUpLine: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  meaningFollowUpTaskButton: {
    width: "100%",
    marginTop: theme.spacing.sm,
  },
  meaningFollowUpTaskStatus: {
    marginTop: theme.spacing.sm,
  },
  meaningFollowUpTaskError: {
    marginTop: theme.spacing.xs,
  },
  narrativeSaveError: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
  narrativeSaveOk: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
    fontWeight: "600",
  },
  publishedParentHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: theme.spacing.sm,
  },
  publishButton: {
    width: "100%",
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  publishedBadge: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: "700",
    marginBottom: theme.spacing.xs,
  },
  schoolLine: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  parentBullet: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  parentActionPlayerBlock: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  parentActionPlayerName: {
    ...theme.typography.subtitle,
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  playerBlock: {
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  playerName: {
    ...theme.typography.subtitle,
    fontWeight: "600",
    color: theme.colors.primary,
    marginBottom: 4,
  },
  domainHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  evidenceBox: {
    marginTop: theme.spacing.sm,
  },
  evidenceLine: {
    ...theme.typography.caption,
    color: theme.colors.text,
    lineHeight: 18,
    marginBottom: 6,
  },
  evidenceDir: {
    fontWeight: "700",
    color: theme.colors.primary,
  },
  noteLine: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  noteWho: {
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  empty: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },
  footerHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
  },
  error: {
    ...theme.typography.body,
    color: theme.colors.error,
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  muted: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  btnGap: {
    marginTop: theme.spacing.md,
  },
});
