/**
 * Placeholder: schedule detail links here for "Hockey ID history".
 * Prevents unmatched-route / blank screen until a full history API exists.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { getParamId } from "@/lib/params";
import { theme } from "@/constants/theme";

export default function PlayerHockeyHistoryScreen() {
  const router = useRouter();
  const { id, trainingSessionId } = useLocalSearchParams<{
    id: string;
    trainingSessionId?: string;
  }>();
  const playerId = getParamId(id);

  return (
    <ScreenContainer>
      <View style={styles.wrap}>
        <Text style={styles.title}>Hockey ID — история</Text>
        <Text style={styles.body}>
          Экран в разработке: здесь будет история метрик и событий по игроку.
          {trainingSessionId ? `\n\nКонтекст тренировки: ${trainingSessionId}` : ""}
        </Text>
        <PrimaryButton
          title="К профилю игрока"
          onPress={() => {
            if (playerId) {
              router.replace(`/player/${playerId}` as const);
            } else {
              router.back();
            }
          }}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  body: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
});
