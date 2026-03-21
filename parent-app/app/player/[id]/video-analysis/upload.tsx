import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import Animated from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { createAndUploadVideoAnalysis } from "@/services/videoAnalysisService";
import { VideoAnalysisHeader } from "@/components/video-analysis/VideoAnalysisHeader";
import { VideoRequirementsCard } from "@/components/video-analysis/VideoRequirementsCard";
import { UploadVideoCard } from "@/components/video-analysis/UploadVideoCard";
import { SelectedVideoPreview } from "@/components/video-analysis/SelectedVideoPreview";
import { UploadProgressCard } from "@/components/video-analysis/UploadProgressCard";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { Input, PrimaryButton } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PLAYER_MARK_GOLYSH } from "@/constants/mockPlayerMarkGolysh";

type PickedVideo = {
  uri: string;
  fileName: string;
  durationSeconds: number;
  fileSizeBytes: number;
  mimeType: string;
};

const HARD_MAX_SECONDS = 60;
const HARD_MAX_BYTES = 150 * 1024 * 1024;
const PRESSED_OPACITY = 0.88;

export default function UploadVideoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Готово к загрузке");

  const validationError = useMemo(() => {
    if (!video) return null;
    if (!video.mimeType.includes("mp4")) return "Поддерживается только формат MP4.";
    if (video.durationSeconds > HARD_MAX_SECONDS) {
      return "Видео слишком длинное. Загрузите эпизод до 60 секунд.";
    }
    if (video.fileSizeBytes > HARD_MAX_BYTES) {
      return "Файл слишком большой. Максимальный размер — 150 МБ.";
    }
    return null;
  }, [video]);

  const pickFromLibrary = async () => {
    triggerHaptic();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Доступ запрещен", "Нужен доступ к галерее.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const a = result.assets[0];
    setVideo({
      uri: a.uri,
      fileName: a.fileName || `video-${Date.now()}.mp4`,
      durationSeconds: Math.round((a.duration ?? 0) / 1000),
      fileSizeBytes: a.fileSize ?? 0,
      mimeType: a.mimeType || "video/mp4",
    });
  };

  const recordVideo = async () => {
    triggerHaptic();
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Доступ запрещен", "Нужен доступ к камере.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["videos"],
      quality: 1,
      videoMaxDuration: HARD_MAX_SECONDS,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const a = result.assets[0];
    setVideo({
      uri: a.uri,
      fileName: a.fileName || `video-${Date.now()}.mp4`,
      durationSeconds: Math.round((a.duration ?? 0) / 1000),
      fileSizeBytes: a.fileSize ?? 0,
      mimeType: a.mimeType || "video/mp4",
    });
  };

  const handleUpload = async () => {
    if (!id || !user?.id || !video || validationError || uploading) return;
    triggerHaptic();
    setUploading(true);
    try {
      setProgress(15);
      setStatusText("Создаем сессию загрузки");
      const created = await createAndUploadVideoAnalysis({
        playerId: id,
        parentId: user.id,
        title: title || undefined,
        description: description || undefined,
        fileName: video.fileName,
        fileSizeBytes: video.fileSizeBytes,
        mimeType: video.mimeType,
        durationSeconds: video.durationSeconds,
        videoUri: video.uri,
      });
      setProgress(100);
      setStatusText("Видео загружено и отправлено на анализ");
      router.replace(`/player/${id}/video-analysis/success?analysisId=${created.id}`);
    } catch (e) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось загрузить видео");
      setStatusText("Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  const header = (
    <View style={[styles.customHeader, { paddingTop: insets.top + spacing.lg }]}>
      <Pressable
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: PRESSED_OPACITY }]}
        onPress={() => {
          triggerHaptic();
          router.back();
        }}
        accessibilityRole="button"
        accessibilityLabel="Назад"
      >
        <Ionicons name="arrow-back" size={24} color="#ffffff" />
      </Pressable>
      <Text style={styles.headerTitle}>Загрузка видео</Text>
      <View style={styles.headerBtn} />
    </View>
  );

  return (
    <FlagshipScreen header={header}>
      <Animated.View entering={screenReveal(0)}>
        <VideoAnalysisHeader playerName={PLAYER_MARK_GOLYSH.profile.fullName} />
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER)}>
        <VideoRequirementsCard />
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 2)}>
        <UploadVideoCard onPickGallery={pickFromLibrary} onRecord={recordVideo} disabled={uploading} />
      </Animated.View>

      {video && (
        <>
          <Animated.View entering={screenReveal(STAGGER * 3)}>
            <SelectedVideoPreview
              fileName={video.fileName}
              durationSeconds={video.durationSeconds}
              fileSizeBytes={video.fileSizeBytes}
            />
          </Animated.View>
          <Animated.View entering={screenReveal(STAGGER * 4)}>
            <SectionCard title="Описание" style={styles.formCard}>
              <Text style={styles.label}>Название (опционально)</Text>
              <Input
                value={title}
                onChangeText={setTitle}
                placeholder="Бросок / Катание / Игровой момент"
                style={styles.inputSpacing}
              />
              <Text style={styles.label}>Комментарий (опционально)</Text>
              <Input
                value={description}
                onChangeText={setDescription}
                placeholder="Что хотите проверить в этом эпизоде?"
                multiline
                style={styles.inputSpacing}
              />
            </SectionCard>
          </Animated.View>
        </>
      )}

      {validationError && (
        <Animated.View entering={screenReveal(STAGGER * 5)}>
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={20} color={colors.error} />
            <Text style={styles.errorText}>{validationError}</Text>
          </View>
        </Animated.View>
      )}

      {(uploading || progress > 0) && (
        <Animated.View entering={screenReveal(STAGGER * 5)}>
          <UploadProgressCard status={statusText} progress={progress} />
        </Animated.View>
      )}

      <Animated.View entering={screenReveal(STAGGER * 6)} style={styles.uploadWrap}>
        <PrimaryButton
          label={uploading ? "Загрузка..." : "Загрузить на анализ"}
          onPress={handleUpload}
          disabled={uploading || !video || !!validationError}
        />
      </Animated.View>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", lineHeight: 22, color: "#ffffff" },
  headerBtn: { width: 40, height: 40 },
  formCard: { marginBottom: spacing.xl },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  inputSpacing: { marginBottom: spacing.lg },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.errorSoft,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: { ...typography.body, color: colors.error, fontWeight: "600", flex: 1 },
  uploadWrap: { marginTop: spacing.md },
});
