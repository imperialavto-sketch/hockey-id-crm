import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SharePlayerCard } from "./SharePlayerCard";
import type { SharePlayerCardProps } from "./SharePlayerCard";

const CAPTURE_WIDTH = 1080;
const CAPTURE_HEIGHT = 1080;

export interface SharePlayerSheetProps extends SharePlayerCardProps {
  visible: boolean;
  onClose: () => void;
}

export function SharePlayerSheet({
  visible,
  onClose,
  name,
  position,
  team,
  number,
  age,
  city,
  photo,
  stats,
}: SharePlayerSheetProps) {
  const captureRefInner = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (!captureRefInner.current || sharing) return;
    setSharing(true);
    try {
      const uri = await captureRef(captureRefInner, {
        format: "jpg",
        quality: 1,
        width: CAPTURE_WIDTH,
        height: CAPTURE_HEIGHT,
        result: "tmpfile",
      });
      if (uri) {
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/jpeg",
            dialogTitle: "Поделиться карточкой игрока",
          });
        }
      }
    } catch (e) {
      // Ignore - share cancelled or unavailable
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          <Animated.View entering={FadeInDown.duration(350)} style={styles.cardWrap}>
            <View ref={captureRefInner} collapsable={false} style={styles.cardInner}>
              <SharePlayerCard
                name={name}
                position={position}
                team={team}
                number={number}
                age={age}
                city={city}
                photo={photo}
                stats={stats}
              />
            </View>
          </Animated.View>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.shareBtn, pressed && styles.shareBtnPressed]}
              onPress={handleShare}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={22} color="#fff" />
                  <Text style={styles.shareBtnText}>Поделиться карточкой</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.8 }]}
              onPress={onClose}
            >
              <Text style={styles.closeBtnText}>Закрыть</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    padding: 24,
  },
  cardWrap: {
    borderRadius: 24,
    overflow: "hidden",
  },
  cardInner: {
    overflow: "hidden",
  },
  actions: {
    marginTop: 24,
    alignItems: "center",
    gap: 12,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  shareBtnPressed: {
    opacity: 0.9,
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  closeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
});
