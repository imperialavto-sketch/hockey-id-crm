import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { createTeamPost } from "@/services/teamService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { PrimaryButton, Input } from "@/components/ui";
import { triggerHaptic } from "@/lib/haptics";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { spacing, inputStyles } from "@/constants/theme";

const PRESSED_OPACITY = 0.88;

export default function CreatePostScreen() {
  const router = useRouter();
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
    <ScreenHeader
      title="Новый пост"
      subtitle="Расскажите команде"
      onBack={() => {
        triggerHaptic();
        router.back();
      }}
    />
  );

  return (
    <FlagshipScreen header={header} scroll={false}>
      <View style={styles.form}>
        <Input
          value={text}
          onChangeText={setText}
          placeholder="Что хотите рассказать команде?"
          multiline
          maxLength={1000}
          style={styles.input}
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
  form: {
    flex: 1,
    padding: spacing.screenPadding,
    gap: inputStyles.formFieldGap,
  },
  input: {
    flex: 1,
    textAlignVertical: "top",
  },
});
