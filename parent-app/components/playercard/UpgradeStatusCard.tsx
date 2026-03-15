import React from "react";
import { colors } from "@/constants/theme";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { TrendingUp, Target, Zap, Calendar } from "lucide-react-native";
import type { UpgradeStatus } from "@/constants/mockDynamicCard";

interface UpgradeStatusCardProps {
  status: UpgradeStatus;
}

export function UpgradeStatusCard({ status }: UpgradeStatusCardProps) {
  const content = (
    <View style={styles.content}>
      <LinearGradient
        colors={[colors.accentSoft, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.edgeGlow}
      />
      <View style={styles.header}>
        <View style={styles.titleBadge}>
          <Zap size={16} color={colors.accent} strokeWidth={2.5} />
          <Text style={styles.title}>Upgrade Status</Text>
        </View>
      </View>
      <View style={styles.grid}>
        <View style={[styles.cell, styles.cellHighlight]}>
          <View style={[styles.iconWrap, styles.iconBlue]}>
            <Calendar size={18} color="#60A5FA" strokeWidth={2.5} />
          </View>
          <Text style={styles.label}>Last updated</Text>
          <Text style={styles.value}>{status.lastUpdated}</Text>
        </View>
        <View style={styles.cell}>
          <View style={[styles.iconWrap, styles.iconGreen]}>
            <TrendingUp size={18} color="#34D399" strokeWidth={2.5} />
          </View>
          <Text style={styles.label}>OVR change</Text>
          <Text style={[styles.value, styles.valueGreen]}>
            {status.ovrChange}
          </Text>
        </View>
        <View style={styles.cell}>
          <View style={[styles.iconWrap, styles.iconAmber]}>
            <Zap size={18} color="#FBBF24" strokeWidth={2.5} />
          </View>
          <Text style={styles.label}>Best growth</Text>
          <Text style={[styles.value, styles.valueAmber]}>
            {status.bestGrowth}
          </Text>
        </View>
        <View style={styles.cell}>
          <View style={[styles.iconWrap, styles.iconCyan]}>
            <Target size={18} color="#22D3EE" strokeWidth={2.5} />
          </View>
          <Text style={styles.label}>Next target</Text>
          <Text style={[styles.value, styles.valueCyan]}>{status.nextTarget}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.wrap}>
      {Platform.OS === "web" ? (
        <View style={[styles.card, styles.cardWeb]}>{content}</View>
      ) : (
        <BlurView intensity={40} tint="dark" style={styles.card}>
          {content}
        </BlurView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 28,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  card: {
    borderRadius: 28,
    overflow: "hidden",
    padding: 24,
  },
  cardWeb: {
    backgroundColor: "rgba(8,16,28,0.94)",
  },
  content: {},
  edgeGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    opacity: 0.8,
    zIndex: 1,
  },
  header: {
    marginBottom: 20,
  },
  titleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.35,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  cell: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  cellHighlight: {
    borderColor: colors.border,
    backgroundColor: colors.accentSoft,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 10,
  },
  iconBlue: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.border,
  },
  iconGreen: {
    backgroundColor: "rgba(52,211,153,0.12)",
    borderColor: "rgba(52,211,153,0.3)",
  },
  iconAmber: {
    backgroundColor: "rgba(251,191,36,0.12)",
    borderColor: "rgba(251,191,36,0.3)",
  },
  iconCyan: {
    backgroundColor: "rgba(34,211,238,0.12)",
    borderColor: "rgba(34,211,238,0.3)",
  },
  label: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  value: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  valueGreen: {
    color: "#34D399",
  },
  valueAmber: {
    color: "#FBBF24",
  },
  valueCyan: {
    color: "#22D3EE",
  },
});
