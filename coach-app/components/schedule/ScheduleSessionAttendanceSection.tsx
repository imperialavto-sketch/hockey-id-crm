import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { theme } from "@/constants/theme";
import type { TrainingAttendancePlayer } from "@/services/coachScheduleService";
import {
  COACH_SESSION_DETAIL_COPY as COPY,
  COACH_SCHEDULE_AUTH_LINE,
} from "@/lib/coachScheduleSessionDetailUi";

export type ScheduleSessionAttendanceSectionProps = {
  /** Список игроков и статусы посещаемости (`GET .../attendance`). */
  attendance: TrainingAttendancePlayer[];
  /** Ошибка загрузки блока или текст про авторизацию. */
  attendanceError: string | null;
  /** Какой массовый сейчас применяется (`present` / `absent`), иначе `null`. */
  bulkTarget: "present" | "absent" | null;
  /** Игрок, для которого идёт сохранение одной отметки. */
  savingPlayerId: string | null;
  /** Массовая отметка всех (`POST .../attendance/bulk`). */
  onBulkSet: (status: "present" | "absent") => void;
  /** Отметка одного игрока (`PATCH`/`POST` в зависимости от API-обёртки). */
  onSetStatus: (playerId: string, status: "present" | "absent") => void;
  /** Повторная загрузка списка посещаемости. */
  onRetryLoad: () => void;
  /** Переход в профиль игрока из контекста сессии. */
  openPlayerFromSession: (playerId: string) => void;
  /** Слоты Hockey ID / внимание под именем игрока. */
  renderHockeyIdLinks: (playerId: string, name: string) => React.ReactNode;
};

/**
 * Блок посещаемости на карточке тренировки (`schedule/[id]`).
 * Состояние `present` / `absent` / `null` приходит с API; «не отмечено» = оба чипа неактивны.
 */
export function ScheduleSessionAttendanceSection({
  attendance,
  attendanceError,
  bulkTarget,
  savingPlayerId,
  onBulkSet,
  onSetStatus,
  onRetryLoad,
  openPlayerFromSession,
  renderHockeyIdLinks,
}: ScheduleSessionAttendanceSectionProps) {
  return (
    <SectionCard elevated>
      <Text style={styles.sectionKicker}>{COPY.sectionAttendance}</Text>
      {attendance.length > 0 ? (
        <View style={styles.bulkRow}>
          <Pressable
            onPress={() => void onBulkSet("present")}
            disabled={bulkTarget !== null || savingPlayerId !== null}
            style={[
              styles.bulkBtn,
              (bulkTarget !== null || savingPlayerId !== null) &&
                styles.bulkBtnDisabled,
            ]}
          >
            {bulkTarget === "present" ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={styles.bulkBtnText}>{COPY.bulkAllPresent}</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => void onBulkSet("absent")}
            disabled={bulkTarget !== null || savingPlayerId !== null}
            style={[
              styles.bulkBtn,
              (bulkTarget !== null || savingPlayerId !== null) &&
                styles.bulkBtnDisabled,
            ]}
          >
            {bulkTarget === "absent" ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={styles.bulkBtnText}>{COPY.bulkAllAbsent}</Text>
            )}
          </Pressable>
        </View>
      ) : null}
      {attendanceError ? (
        <View style={styles.errBlock}>
          <Text style={styles.attErr}>{attendanceError}</Text>
          {attendanceError !== COACH_SCHEDULE_AUTH_LINE ? (
            <Text style={styles.errorHintSmall}>{COPY.networkRetryHint}</Text>
          ) : null}
          <PrimaryButton
            title={COPY.retryCta}
            variant="outline"
            onPress={() => void onRetryLoad()}
            style={styles.inlineRetryBtn}
          />
        </View>
      ) : attendance.length === 0 ? (
        <Text style={styles.rowMuted}>{COPY.attendanceEmptyHint}</Text>
      ) : (
        attendance.map((p) => (
          <View key={p.playerId} style={styles.playerRow}>
            <View style={styles.playerLeftCol}>
              <Pressable
                onPress={() => openPlayerFromSession(p.playerId)}
                style={styles.playerNamePress}
                accessibilityRole="button"
                accessibilityLabel={`Карточка игрока ${p.name}`}
              >
                <Text style={styles.playerName} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.playerCardCue}>Карточка</Text>
              </Pressable>
              {renderHockeyIdLinks(p.playerId, p.name)}
            </View>
            <View style={styles.btnRow}>
              <Pressable
                onPress={() => void onSetStatus(p.playerId, "present")}
                disabled={savingPlayerId === p.playerId || bulkTarget !== null}
                style={[
                  styles.markBtn,
                  p.status === "present" && styles.markBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.markBtnText,
                    p.status === "present" && styles.markBtnTextActive,
                  ]}
                >
                  {COPY.attendancePresent}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void onSetStatus(p.playerId, "absent")}
                disabled={savingPlayerId === p.playerId || bulkTarget !== null}
                style={[
                  styles.markBtn,
                  p.status === "absent" && styles.markBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.markBtnText,
                    p.status === "absent" && styles.markBtnTextActive,
                  ]}
                >
                  {COPY.attendanceAbsent}
                </Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  sectionKicker: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  bulkRow: {
    flexDirection: "column",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  bulkBtn: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primaryMuted,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  bulkBtnDisabled: {
    opacity: 0.55,
  },
  bulkBtnText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: "600",
    textAlign: "center",
  },
  errBlock: {
    marginTop: theme.spacing.xs,
  },
  errorHintSmall: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  inlineRetryBtn: {
    alignSelf: "flex-start",
    minWidth: 160,
  },
  attErr: {
    ...theme.typography.caption,
    color: theme.colors.error,
  },
  rowMuted: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    lineHeight: 18,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  playerLeftCol: {
    flex: 1,
    minWidth: 0,
    marginRight: theme.spacing.md,
  },
  playerNamePress: {
    alignSelf: "stretch",
  },
  playerName: { ...theme.typography.body, color: theme.colors.text },
  playerCardCue: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
    fontSize: 11,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    alignSelf: "flex-start",
    paddingTop: 2,
  },
  markBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.surfaceElevated,
  },
  markBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  markBtnText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: "600",
  },
  markBtnTextActive: {
    color: theme.colors.primary,
  },
});
