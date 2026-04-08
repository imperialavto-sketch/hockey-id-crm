import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SectionCard } from "@/components/ui/SectionCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { theme } from "@/constants/theme";
import type { CoachLiveTrainingActionCandidate } from "@/services/coachPlayersService";
import { DOMAIN_TITLE_RU } from "@/lib/coachAgeStandardsPresentation";

function formatDomainsLine(domains: string[]): string {
  if (!domains.length) return "";
  return domains
    .map((d) => DOMAIN_TITLE_RU[d as keyof typeof DOMAIN_TITLE_RU] ?? d)
    .join(" · ");
}

const SECTION_TITLE = "Смены · следующий шаг";
const SECTION_SUB =
  "Из подтверждённых отметок. «В работу» — в список созданных задач.";

function priorityLabel(p: string): string {
  if (p === "high") return "Выше";
  if (p === "medium") return "Средне";
  return "Ниже";
}

function toneBar(tone: string): string {
  if (tone === "positive") return theme.colors.primary;
  if (tone === "attention") return theme.colors.warning;
  return theme.colors.textMuted;
}

type Props = {
  loading: boolean;
  items: CoachLiveTrainingActionCandidate[];
  lowData: boolean;
  loadError: string | null;
  materializingCandidateId: string | null;
  onAddToWorkflow: (candidateId: string) => void | Promise<void>;
};

export function CoachPlayerLiveTrainingFocusSection({
  loading,
  items,
  lowData,
  loadError,
  materializingCandidateId,
  onAddToWorkflow,
}: Props) {
  const router = useRouter();
  const show = items.slice(0, 4);

  return (
    <DashboardSection title={SECTION_TITLE}>
      <Text style={styles.sectionSub}>{SECTION_SUB}</Text>
      <SectionCard elevated style={styles.card}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.muted}>Загрузка…</Text>
          </View>
        ) : loadError ? (
          <Text style={styles.errorText}>{loadError}</Text>
        ) : lowData || show.length === 0 ? (
          <Text style={styles.emptyText}>
            Действия появятся после нескольких подтверждённых наблюдений с сигналами по этому игроку.
          </Text>
        ) : (
          <>
            {show.map((it, idx) => {
              const done = Boolean(it.isMaterialized);
              const busy = materializingCandidateId === it.id;
              return (
                <View key={it.id} style={[styles.row, idx > 0 && styles.rowDivider]}>
                  <View style={[styles.accent, { backgroundColor: toneBar(it.tone) }]} />
                  <View style={styles.rowBody}>
                    <View style={styles.rowTop}>
                      <Text style={styles.priorityBadge}>{priorityLabel(it.priority)}</Text>
                      <Text style={styles.sourceHint} numberOfLines={1}>
                        Live training
                      </Text>
                    </View>
                    <Text style={styles.title}>{it.title}</Text>
                    <Text style={styles.body}>{it.body}</Text>
                    {it.basedOn.domains.length > 0 ? (
                      <Text style={styles.domainsLine} numberOfLines={3}>
                        Связано с доменами LT: {formatDomainsLine(it.basedOn.domains)}
                      </Text>
                    ) : null}
                    <View style={styles.ctaRow}>
                      {done ? (
                        <Text style={styles.doneLabel}>Добавлено</Text>
                      ) : (
                        <Pressable
                          onPress={() => void onAddToWorkflow(it.id)}
                          disabled={busy || !!materializingCandidateId}
                          style={({ pressed }) => [
                            styles.addBtn,
                            (busy || !!materializingCandidateId) && styles.addBtnDisabled,
                            pressed && !busy && !materializingCandidateId && styles.addBtnPressed,
                          ]}
                        >
                          {busy ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                          ) : (
                            <Text style={styles.addBtnText}>Добавить в работу</Text>
                          )}
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
            <Pressable
              onPress={() =>
                router.push("/created-actions" as Parameters<typeof router.push>[0])
              }
              style={({ pressed }) => [styles.hintLinkWrap, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.hintLink}>Открыть созданные задачи</Text>
            </Pressable>
          </>
        )}
      </SectionCard>
    </DashboardSection>
  );
}

const styles = StyleSheet.create({
  sectionSub: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  card: {
    paddingVertical: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  muted: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.error,
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  accent: {
    width: 3,
    borderRadius: 2,
    marginTop: 4,
    minHeight: 40,
    alignSelf: "stretch",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  priorityBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sourceHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    flex: 1,
    textAlign: "right",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  domainsLine: {
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textMuted,
    marginTop: 6,
    fontStyle: "italic",
  },
  ctaRow: {
    marginTop: 10,
    minHeight: 36,
    justifyContent: "center",
  },
  addBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  addBtnPressed: {
    opacity: 0.92,
  },
  addBtnDisabled: {
    opacity: 0.45,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  doneLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  hintLinkWrap: {
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 4,
  },
  hintLink: {
    fontSize: 13,
    color: theme.colors.primary,
    textDecorationLine: "underline",
  },
});
