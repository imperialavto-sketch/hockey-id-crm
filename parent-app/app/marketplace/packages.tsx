import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TRAINING_PACKAGES } from "@/constants/mockPackages";
import { PackageCard } from "@/components/subscription/PackageCard";
import { useSubscription } from "@/context/SubscriptionContext";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { triggerHaptic } from "@/lib/haptics";
import { screenReveal, STAGGER } from "@/lib/animations";
import { colors, radius, spacing, typography } from "@/constants/theme";

const PRESSED_OPACITY = 0.88;

export default function PackagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addPackage } = useSubscription();

  const handlePurchase = async (pkgCode: string) => {
    triggerHaptic();
    await addPackage(pkgCode);
    router.push({
      pathname: "/subscription/success",
      params: { plan: "package", packageCode: pkgCode },
    });
  };

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
      <Pressable
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: PRESSED_OPACITY }]}
        onPress={() => {
          triggerHaptic();
          router.back();
        }}
        accessibilityRole="button"
        accessibilityLabel="Назад"
      >
        <Ionicons name="chevron-back" size={28} color={colors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>Пакеты тренировок</Text>
    </View>
  );

  return (
    <FlagshipScreen header={header}>
      <Animated.View entering={screenReveal(0)}>
        <Text style={styles.subtitle}>
          Выберите пакет и экономьте на индивидуальных тренировках
        </Text>
      </Animated.View>

      {TRAINING_PACKAGES.length > 0 ? (
        <View style={styles.packages}>
          {TRAINING_PACKAGES.map((pkg, index) => (
            <Animated.View
              key={pkg.id}
              entering={screenReveal(STAGGER + index * 40)}
              style={styles.cardWrap}
            >
              <PackageCard
                pkg={pkg}
                onSelect={() => handlePurchase(pkg.code)}
              />
            </Animated.View>
          ))}
        </View>
      ) : (
        <Animated.View entering={screenReveal(STAGGER)} style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cube-outline" size={36} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyText}>Пакеты временно недоступны</Text>
          <Text style={styles.emptySub}>Попробуйте позже</Text>
        </Animated.View>
      )}
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  header: {
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
    ...typography.sectionTitle,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.xxl,
    lineHeight: 24,
  },
  packages: {
    marginBottom: spacing.xxl,
  },
  cardWrap: {
    marginBottom: spacing.lg,
  },
  emptyWrap: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLevel1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySub: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
