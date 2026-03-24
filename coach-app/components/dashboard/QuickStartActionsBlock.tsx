import React, { useState, useCallback } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { SectionCard } from "@/components/ui/SectionCard";
import { getResumeSessionSummary, COACH_INPUT_ROUTE } from "@/lib/resumeSessionHelpers";
import { theme } from "@/constants/theme";

type QuickAction = {
  id: string;
  label: string;
  route: string;
};

const STATIC_ACTIONS: QuickAction[] = [
  { id: "reports", label: "Отчёты недели", route: "/reports" },
  { id: "drafts", label: "Черновики родителям", route: "/parent-drafts" },
  { id: "actions", label: "Требуют внимания", route: "/actions" },
];

export function QuickStartActionsBlock() {
  const router = useRouter();
  const [sessionLabel, setSessionLabel] = useState<"start" | "resume">("start");

  useFocusEffect(
    useCallback(() => {
      getResumeSessionSummary().then((summary) => {
        setSessionLabel(summary ? "resume" : "start");
      });
    }, [])
  );

  const sessionAction: QuickAction = {
    id: "session",
    label: sessionLabel === "resume" ? "Продолжить тренировку" : "Начать тренировку",
    route: COACH_INPUT_ROUTE,
  };

  const actions = [sessionAction, ...STATIC_ACTIONS];

  const handlePress = (route: string) => {
    router.push(route as Parameters<typeof router.push>[0]);
  };

  return (
    <SectionCard elevated style={styles.card}>
      <View style={styles.grid}>
        {actions.map((action) => (
          <Pressable
            key={action.id}
            style={({ pressed }) => [
              styles.pill,
              action.id === "session" && styles.pillPrimary,
              pressed && styles.pressed,
            ]}
            onPress={() => handlePress(action.route)}
          >
            <View style={styles.pillContent}>
              <Text
                style={[
                  styles.pillText,
                  action.id === "session" && styles.pillTextPrimary,
                ]}
                numberOfLines={1}
              >
                {action.label}
              </Text>
              {action.id === "session" && sessionLabel === "resume" && (
                <View style={styles.resumeDot} />
              )}
            </View>
          </Pressable>
        ))}
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  pill: {
    flex: 1,
    minWidth: "47%",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pillPrimary: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
  },
  pillContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  resumeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  pillText: {
    ...theme.typography.subtitle,
    fontSize: 14,
    color: theme.colors.text,
  },
  pillTextPrimary: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.8,
  },
});
