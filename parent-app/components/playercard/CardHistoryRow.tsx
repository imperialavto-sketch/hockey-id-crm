import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight } from "lucide-react-native";
import type { CardHistoryItem, DynamicCardVariant } from "@/constants/mockDynamicCard";
import { colors } from "@/constants/theme";

const CARD_GAP = 16;
const MINI_CARD_WIDTH = 112;
const MINI_CARD_HEIGHT = 148;

const VARIANT_STYLES: Record<
  DynamicCardVariant,
  {
    gradient: readonly [string, string, string];
    border: string;
    topAccent: string;
    ovrBg: string;
  }
> = {
  season: {
    gradient: [
      "rgba(37,99,235,0.28)",
      "rgba(8,16,28,0.95)",
      "rgba(239,68,68,0.12)",
    ],
    border: "rgba(96,165,250,0.5)",
    topAccent: "rgba(96,165,250,0.9)",
    ovrBg: "rgba(59,130,246,0.3)",
  },
  elite: {
    gradient: [
      "rgba(139,92,246,0.32)",
      "rgba(8,16,28,0.95)",
      "rgba(236,72,153,0.12)",
    ],
    border: "rgba(167,139,250,0.6)",
    topAccent: "rgba(192,132,252,0.95)",
    ovrBg: "rgba(139,92,246,0.35)",
  },
  tournament: {
    gradient: [
      "rgba(251,191,36,0.3)",
      "rgba(8,16,28,0.95)",
      "rgba(239,68,68,0.15)",
    ],
    border: "rgba(253,224,71,0.6)",
    topAccent: "rgba(253,224,71,0.95)",
    ovrBg: "rgba(245,158,11,0.35)",
  },
  future_star: {
    gradient: [
      colors.accentSoft,
      "rgba(8,16,28,0.95)",
      "rgba(139,92,246,0.15)",
    ],
    border: colors.border,
    topAccent: colors.accent,
    ovrBg: colors.accentSoft,
  },
};

interface CardHistoryRowProps {
  items: CardHistoryItem[];
}

function MiniCard({
  item,
  index,
  isCurrent,
}: {
  item: CardHistoryItem;
  index: number;
  isCurrent: boolean;
}) {
  const s = VARIANT_STYLES[item.variant];
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify()}
      style={[
        styles.miniCard,
        { borderColor: s.border },
        isCurrent && styles.miniCardCurrent,
      ]}
    >
      <LinearGradient
        colors={s.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.topAccent, { backgroundColor: s.topAccent }]} />
      <View style={styles.miniContent}>
        <Text
          style={[styles.miniLabel, isCurrent && styles.miniLabelCurrent]}
          numberOfLines={2}
        >
          {item.label}
        </Text>
        <View style={[styles.miniOvrWrap, { backgroundColor: s.ovrBg }]}>
          <Text style={styles.miniOvr}>{item.ovr}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export function CardHistoryRow({ items }: CardHistoryRowProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Evolution</Text>
        <Text style={styles.sectionSub}>Your player card journey</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
      >
        {items.map((item, index) => (
          <View key={item.id} style={styles.cardWithArrow}>
            <MiniCard
              item={item}
              index={index}
              isCurrent={index === items.length - 1}
            />
            {index < items.length - 1 && (
              <View style={styles.arrow}>
                <ChevronRight size={18} color="rgba(148,163,184,0.5)" strokeWidth={2.5} />
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.35,
    marginBottom: 4,
  },
  sectionSub: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  scroll: {
    marginHorizontal: -20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingRight: 36,
    flexDirection: "row",
    alignItems: "center",
  },
  cardWithArrow: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 4,
  },
  arrow: {
    paddingHorizontal: 6,
  },
  miniCard: {
    width: MINI_CARD_WIDTH,
    height: MINI_CARD_HEIGHT,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 2,
    padding: 16,
    justifyContent: "flex-end",
  },
  miniCardCurrent: {
    borderWidth: 2.5,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  topAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  miniContent: {
    gap: 12,
  },
  miniLabel: {
    color: "rgba(148,163,184,0.9)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  miniLabelCurrent: {
    color: "#F8FAFC",
    fontWeight: "800",
  },
  miniOvrWrap: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  miniOvr: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
});
