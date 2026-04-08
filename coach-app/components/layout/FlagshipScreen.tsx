import React, { useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  type ViewStyle,
  type ScrollViewProps,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";

const H_PAD = theme.spacing.md;
const TOP_PAD = theme.spacing.lg;
const BOTTOM_EXTRA = theme.spacing.xl + theme.spacing.sm;

export interface FlagshipScreenProps {
  background?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  scrollEnabled?: boolean;
  contentContainerStyle?: ViewStyle;
  contentPaddingTopExtra?: number;
  refreshControl?: ScrollViewProps["refreshControl"];
  bounces?: boolean;
  safeAreaEdges?: ("top" | "bottom")[];
  scrollFalseTopPadding?: number;
  /** When `scroll={false}`, applied to the flex wrapper (e.g. `{ flex: 1 }`). */
  flexContainerStyle?: ViewStyle;
  /** When `scroll={false}`, merged last (alias for flexContainerStyle; replaces ScreenContainer `style`). */
  style?: ViewStyle;
}

const scrollIOSInset =
  Platform.OS === "ios" ? ({ contentInsetAdjustmentBehavior: "never" as const } as const) : {};

export function FlagshipScreen({
  background,
  header,
  footer,
  children,
  scroll = true,
  scrollEnabled: scrollEnabledProp,
  contentContainerStyle,
  contentPaddingTopExtra = 0,
  refreshControl,
  bounces = true,
  safeAreaEdges = ["bottom"],
  scrollFalseTopPadding,
  flexContainerStyle,
  style: styleProp,
}: FlagshipScreenProps) {
  const insets = useSafeAreaInsets();
  const hasHeader = Boolean(header);
  const scrollEnabled = scroll && scrollEnabledProp !== false;

  const scrollViewLockProps = useMemo(() => {
    const locked = !scrollEnabled;
    return {
      scrollEnabled,
      bounces: scrollEnabled && bounces,
      alwaysBounceVertical: locked ? false : undefined,
      ...(Platform.OS === "android" && locked ? { overScrollMode: "never" as const } : {}),
    } as const;
  }, [scrollEnabled, bounces]);

  const bottomSpacer = useMemo(
    () => ({
      height: theme.spacing.xxl + (safeAreaEdges.includes("bottom") ? insets.bottom : 0),
    }),
    [insets.bottom, safeAreaEdges]
  );

  const bodyTopPadding = safeAreaEdges.includes("top")
    ? TOP_PAD
    : insets.top + TOP_PAD;

  const flexWrapperTopPadding =
    scrollFalseTopPadding !== undefined ? scrollFalseTopPadding : bodyTopPadding;

  const flexPadBottom = useMemo(
    () =>
      safeAreaEdges.includes("bottom")
        ? insets.bottom + theme.layout.screenBottom
        : theme.layout.screenBottom,
    [insets.bottom, safeAreaEdges]
  );

  const scrollContentStyle = useMemo(
    () => [
      styles.content,
      contentContainerStyle,
      { paddingTop: bodyTopPadding + contentPaddingTopExtra },
    ],
    [bodyTopPadding, contentPaddingTopExtra, contentContainerStyle]
  );

  const scrollContentStyleUnderHeader = useMemo(
    () => [
      styles.content,
      contentContainerStyle,
      { paddingTop: TOP_PAD + contentPaddingTopExtra },
    ],
    [contentPaddingTopExtra, contentContainerStyle]
  );

  const headerBlock = hasHeader ? (
    <View style={[styles.headerWrap, { paddingTop: insets.top }]}>{header}</View>
  ) : null;

  if (hasHeader) {
    const useBottomSafeArea = safeAreaEdges.includes("bottom");

    return (
      <View style={styles.screenWrap}>
        {background ?? null}
        <SafeAreaView style={styles.container} edges={useBottomSafeArea ? ["bottom"] : []}>
          {headerBlock}
          {scroll ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={scrollContentStyleUnderHeader}
              showsVerticalScrollIndicator={false}
              refreshControl={refreshControl}
              {...scrollIOSInset}
              {...scrollViewLockProps}
            >
              {children}
              <View style={[styles.bottomSpacer, bottomSpacer]} />
            </ScrollView>
          ) : (
            <View
              style={[
                styles.flex,
                {
                  paddingTop: flexWrapperTopPadding,
                  paddingHorizontal: H_PAD,
                  paddingBottom: flexPadBottom,
                },
                contentContainerStyle,
                flexContainerStyle,
                styleProp,
              ]}
            >
              {children}
            </View>
          )}
          {footer}
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screenWrap}>
      {background ?? null}
      <SafeAreaView style={styles.container} edges={safeAreaEdges}>
        {scroll ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={scrollContentStyle}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
            {...scrollIOSInset}
            {...scrollViewLockProps}
          >
            {children}
            <View style={[styles.bottomSpacer, bottomSpacer]} />
          </ScrollView>
        ) : (
          <View
            style={[
              styles.flex,
              {
                paddingTop: flexWrapperTopPadding,
                paddingHorizontal: H_PAD,
                paddingBottom: flexPadBottom,
              },
              contentContainerStyle,
              flexContainerStyle,
              styleProp,
            ]}
          >
            {children}
          </View>
        )}
        {footer}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrap: { flex: 1, position: "relative", backgroundColor: "transparent" },
  container: { flex: 1, backgroundColor: "transparent" },
  headerWrap: {
    backgroundColor: "transparent",
  },
  scroll: { flex: 1, backgroundColor: "transparent" },
  content: {
    paddingHorizontal: H_PAD,
    paddingBottom: theme.layout.screenBottom + BOTTOM_EXTRA,
  },
  bottomSpacer: { height: theme.spacing.xxl },
  flex: { flex: 1 },
});
