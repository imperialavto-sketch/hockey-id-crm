import React, { useEffect, useRef } from "react";
import { Animated, Modal, StyleSheet, Text, View } from "react-native";
import { theme } from "@/constants/theme";

export type LiveTrainingEntryOverlayPayload = {
  headline: string;
  contextLine: string | null;
  subline: string | null;
};

type Props = {
  visible: boolean;
  payload: LiveTrainingEntryOverlayPayload | null;
  onRequestCancel: () => void;
};

/**
 * Контекстный переход в live-flow: затемнение + текст, без «админского» спиннера.
 */
export function LiveTrainingEntryTransitionOverlay({
  visible,
  payload,
  onRequestCancel,
}: Props) {
  const backdrop = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<ReturnType<typeof Animated.loop> | null>(null);

  useEffect(() => {
    if (!visible || !payload) {
      backdrop.setValue(0);
      content.setValue(0);
      loopRef.current?.stop();
      loopRef.current = null;
      return;
    }
    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(content, {
        toValue: 1,
        damping: 20,
        stiffness: 220,
        useNativeDriver: true,
      }),
    ]).start();

    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loopRef.current.start();
    return () => {
      loopRef.current?.stop();
      loopRef.current = null;
    };
  }, [visible, payload, backdrop, content, pulse]);

  if (!visible || !payload) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onRequestCancel}
    >
      <Animated.View style={[styles.scrim, { opacity: backdrop }]}>
        <View style={styles.center}>
          <Animated.View
            style={[
              styles.card,
              {
                opacity: content,
                transform: [
                  {
                    translateY: content.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.pulseRow}>
              <Animated.View style={[styles.dot, { opacity: pulse }]} />
              <Text style={styles.headline}>{payload.headline}</Text>
            </View>
            {payload.contextLine ? (
              <Text style={styles.context}>{payload.contextLine}</Text>
            ) : null}
            {payload.subline ? <Text style={styles.subline}>{payload.subline}</Text> : null}
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(6, 9, 14, 0.88)",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  center: {
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 340,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  pulseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  headline: {
    flex: 1,
    ...theme.typography.subtitle,
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
    lineHeight: 24,
  },
  context: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: "600",
    marginBottom: theme.spacing.sm,
  },
  subline: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
});
