import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { createTeamPost } from "@/services/teamService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { PrimaryButton } from "@/components/ui";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography, radius } from "@/constants/theme";

const PRESSED_OPACITY = 0.88;

export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    const trimmed = text.trim();
    if (!trimmed || publishing) return;
    setPublishing(true);
    const post = await createTeamPost(trimmed, user?.id);
    setPublishing(false);
    if (post) {
      Alert.alert("Опубликовано", "Ваш пост появится в ленте команды.", [
        { text: "OK", onPress: () => router.replace("/team/feed" as never) },
      ]);
    } else {
      Alert.alert("Ошибка", "Не удалось опубликовать пост. Попробуйте ещё раз.");
    }
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
        <Ionicons name="arrow-back" size={24} color="#ffffff" />
      </Pressable>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Новый пост</Text>
        <Text style={styles.headerSub}>Расскажите команде</Text>
      </View>
    </View>
  );

  return (
    <FlagshipScreen header={header} scroll={false}>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Что хотите рассказать команде?"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={1000}
        />
        <PrimaryButton
          label={publishing ? "Публикуем…" : "Опубликовать"}
          onPress={handlePublish}
          disabled={!text.trim() || publishing}
        />
      </View>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLevel1Border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerCenter: { flex: 1, marginLeft: spacing.sm },
  headerTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  headerSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  form: {
    flex: 1,
    padding: spacing.screenPadding,
    gap: spacing.xl,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...typography.body,
    color: colors.textPrimary,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
});
