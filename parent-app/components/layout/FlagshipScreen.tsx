import React from "react";
import { View, ScrollView, StyleSheet, type ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { PlayerScreenBackground } from "@/components/player/PlayerScreenBackground";
import { spacing } from "@/constants/theme";

export interface FlagshipScreenProps {
  /** Custom background component. Default: PlayerScreenBackground */
  background?: React.ReactNode;
  /** Optional header (e.g. back + title + actions) */
  header?: React.ReactNode;
  /** Optional footer (e.g. SharePlayerSheet modal) */
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Use ScrollView for content. Default: true. Set false for centered error/loading. */
  scroll?: boolean;
  /** ScrollView contentContainerStyle */
  contentContainerStyle?: ViewStyle;
  /** ScrollView bounces. Default: true when scroll */
  bounces?: boolean;
}

/**
 * Shared flagship screen layout: background, SafeAreaView, optional header,
 * ScrollView with content spacing and bottom safe area.
 */
export function FlagshipScreen({
  background,
  header,
  footer,
  children,
  scroll = true,
  contentContainerStyle,
  bounces = true,
}: FlagshipScreenProps) {
  const insets = useSafeAreaInsets();

  const bottomSpacer = { height: spacing.xxl + insets.bottom };
  const contentTopPadding = header
    ? spacing.sm
    : insets.top + spacing.lg;

  return (
    <View style={styles.screenWrap}>
      {background ?? <PlayerScreenBackground />}
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        {header}
        {scroll ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.content,
              { paddingTop: contentTopPadding },
              contentContainerStyle,
            ]}
            showsVerticalScrollIndicator={false}
            bounces={bounces}
          >
            {children}
            <View style={[styles.bottomSpacer, bottomSpacer]} />
          </ScrollView>
        ) : (
          <View style={[styles.flex, !header && { paddingTop: contentTopPadding }]}>
            {children}
          </View>
        )}
        {footer}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrap: { flex: 1, position: "relative" },
  container: { flex: 1, backgroundColor: "transparent" },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.screenBottom + 48,
  },
  bottomSpacer: { height: spacing.xxl },
  flex: { flex: 1 },
});
