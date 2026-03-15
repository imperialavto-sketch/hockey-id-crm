import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import Animated from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import {
  DEVELOPMENT_SUMMARY,
  DEVELOPMENT_FILTERS,
  DEVELOPMENT_EVENTS_BY_YEAR,
  type DevelopmentEventType,
  type DevelopmentFilters,
} from "@/constants/mockDevelopmentTimeline";
import { DevelopmentHeader } from "@/components/player/DevelopmentHeader";
import { DevelopmentTimeline } from "@/components/player/DevelopmentTimeline";
import { ActionLinkCard } from "@/components/player/ActionLinkCard";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { triggerHaptic } from "@/lib/haptics";
import { screenReveal, STAGGER } from "@/lib/animations";
import { colors, spacing, radius } from "@/constants/theme";
import { DEMO_PLAYER } from "@/constants/demoPlayer";

const PRESSED_OPACITY = 0.88;

function SummaryCard() {
  const { currentRating, seasonGrowth, strength, growthZone } = DEVELOPMENT_SUMMARY;
  const content = (
    <View style={summaryStyles.content}>
      <Text style={summaryStyles.title}>Ключевые вехи</Text>
      <View style={summaryStyles.grid}>
        <View style={summaryStyles.cell}>
          <Text style={summaryStyles.value}>{currentRating}</Text>
          <Text style={summaryStyles.label}>Текущий рейтинг</Text>
        </View>
        <View style={[summaryStyles.cell, summaryStyles.cellHighlight]}>
          <Text style={[summaryStyles.value, summaryStyles.valueGreen]}>
            +{seasonGrowth}
          </Text>
          <Text style={summaryStyles.label}>Рост за сезон</Text>
        </View>
        <View style={summaryStyles.cell}>
          <Text style={summaryStyles.value}>{strength}</Text>
          <Text style={summaryStyles.label}>Сильная сторона</Text>
        </View>
        <View style={summaryStyles.cell}>
          <Text style={summaryStyles.value}>{growthZone}</Text>
          <Text style={summaryStyles.label}>Зона роста</Text>
        </View>
      </View>
    </View>
  );

  if (Platform.OS === "web") {
    return (
      <View style={[summaryStyles.card, summaryStyles.cardWeb]}>{content}</View>
    );
  }
  return (
    <View style={summaryStyles.card}>
      <BlurView intensity={32} tint="dark" style={summaryStyles.blur}>
        {content}
      </BlurView>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  card: {
    marginBottom: spacing.xxl,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  cardWeb: {
    backgroundColor: colors.bgMid,
  },
  blur: {
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  content: {
    padding: spacing.xxl,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.4,
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  cell: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.surfaceLightAlt,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  cellHighlight: {
    borderColor: colors.successSoft,
    backgroundColor: colors.successSoft,
  },
  value: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  valueGreen: {
    color: colors.success,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});

function FilterChip({
  item,
  active,
  onPress,
}: {
  item: DevelopmentFilters;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        triggerHaptic();
        onPress();
      }}
      style={[
        filterStyles.chip,
        active && filterStyles.chipActive,
      ]}
    >
      <Text
        style={[
          filterStyles.chipText,
          active && filterStyles.chipTextActive,
        ]}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

const filterStyles = StyleSheet.create({
  chip: {
    marginRight: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  chipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.border,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  chipTextActive: {
    color: colors.accent,
    fontWeight: "800",
  },
});

export default function DevelopmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const [activeFilter, setActiveFilter] = useState<DevelopmentEventType | "all">("all");

  const header = (
    <View style={[styles.customHeader, { paddingTop: insets.top + spacing.lg }]}>
      <Pressable
        onPress={() => {
          triggerHaptic();
          router.back();
        }}
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: PRESSED_OPACITY }]}
        accessibilityRole="button"
        accessibilityLabel="Назад"
      >
        <Ionicons name="chevron-back" size={28} color={colors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>Путь развития</Text>
    </View>
  );

  return (
    <FlagshipScreen header={header}>
      <Animated.View entering={screenReveal(0)}>
        <DevelopmentHeader
          playerName={DEMO_PLAYER.name}
          subtitle="Путь развития игрока"
        />
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER)}>
        <SummaryCard />
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 2)}>
        <ActionLinkCard
          icon="sparkles"
          title="AI Coach Report"
          description="Сильные стороны, зоны роста и рекомендации"
          onPress={() => {
            triggerHaptic();
            const playerId = params.id ?? "1";
            router.push(`/player/${playerId}/ai-report`);
          }}
          variant="accent"
        />
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 3)}>
        <SectionCard title="События">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterWrap}
          >
            {DEVELOPMENT_FILTERS.map((f) => (
              <FilterChip
                key={f.id}
                item={f}
                active={activeFilter === f.type}
                onPress={() => setActiveFilter(f.type)}
              />
            ))}
          </ScrollView>
          <DevelopmentTimeline
            eventsByYear={DEVELOPMENT_EVENTS_BY_YEAR}
            activeFilter={activeFilter}
          />
        </SectionCard>
      </Animated.View>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLevel1Border,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginLeft: spacing.sm,
  },
  filterScroll: {
    marginHorizontal: -spacing.xl,
    marginBottom: spacing.lg,
  },
  filterWrap: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    flexDirection: "row",
  },
});
