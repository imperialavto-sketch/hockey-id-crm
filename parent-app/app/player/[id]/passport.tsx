import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import Animated from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { getFullPlayerProfile } from "@/services/playerService";
import { Ionicons } from "@expo/vector-icons";
import { PlayerPassportHeader } from "@/components/player/PlayerPassportHeader";
import { PassportBackground } from "@/components/player/PassportBackground";
import { PassportInfoCard } from "@/components/player/PassportInfoCard";
import { PassportFieldRow } from "@/components/player/PassportFieldRow";
import { PassportBadgeRow } from "@/components/player/PassportBadgeRow";
import { SharePlayerSheet } from "@/components/player/SharePlayerSheet";
import { SkeletonBlock, ErrorStateView } from "@/components/ui";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { DEMO_PLAYER } from "@/constants/demoPlayer";
import { PLAYER_MARK_GOLYSH, PLAYER_AGE } from "@/constants/mockPlayerMarkGolysh";
import { colors, shadows, spacing } from "@/constants/theme";
import type { Player, PlayerStats } from "@/types";

const PRESSED_OPACITY = 0.88;
type ProfileErrorStateKind = "not_found" | "network";

function PassportSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={180} style={styles.skeletonHeader} />
      <SkeletonBlock height={140} style={styles.skeletonCard} />
      <SkeletonBlock height={140} style={styles.skeletonCard} />
      <SkeletonBlock height={100} style={styles.skeletonCard} />
    </View>
  );
}

function PassportHeader({
  onBack,
  onShare,
  showShareButton = false,
}: {
  onBack: () => void;
  onShare?: () => void;
  showShareButton?: boolean;
}) {
  return (
    <ScreenHeader
      title="Паспорт игрока"
      onBack={onBack}
      rightAction={
        showShareButton ? (
          <Pressable
            style={({ pressed }) => [
              { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
              pressed && { opacity: PRESSED_OPACITY },
            ]}
            onPress={onShare}
            accessibilityRole="button"
            accessibilityLabel="Поделиться"
          >
            <Ionicons name="share-outline" size={24} color={colors.text} />
          </Pressable>
        ) : undefined
      }
    />
  );
}

const POSITION_MAP: Record<string, string> = {
  Forward: "Нападающий",
  Defenseman: "Защитник",
  Goaltender: "Вратарь",
  Center: "Центр",
};

export default function PlayerPassportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<ProfileErrorStateKind | null>(null);
  const mountedRef = useRef(true);
  const profileRequestRef = useRef(0);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const goBack = useCallback(() => {
    triggerHaptic();
    router.back();
  }, [router]);

  const openShareSheet = useCallback(() => {
    triggerHaptic();
    setShareSheetVisible(true);
  }, []);

  const loadProfile = useCallback(async () => {
    const requestId = ++profileRequestRef.current;
    const canCommit = () => mountedRef.current && requestId === profileRequestRef.current;

    if (!id || typeof id !== "string") {
      if (canCommit()) {
        setPlayer(null);
        setStats(null);
        setProfileError("not_found");
        setLoading(false);
      }
      return;
    }

    if (!user?.id) {
      if (canCommit()) {
        setPlayer(null);
        setStats(null);
        setProfileError("network");
        setLoading(false);
      }
      return;
    }

    if (canCommit()) {
      setLoading(true);
      setProfileError(null);
    }

    try {
      const profile = await getFullPlayerProfile(id, user.id, { includeVideoAnalyses: false });
      if (!canCommit()) return;

      if (profile) {
        setPlayer(profile.player);
        setStats(profile.stats);
        setProfileError(null);
      } else {
        setPlayer(null);
        setStats(null);
        setProfileError("not_found");
      }
    } catch {
      if (canCommit()) {
        setPlayer(null);
        setStats(null);
        setProfileError("network");
      }
    } finally {
      if (canCommit()) {
        setLoading(false);
      }
    }
  }, [id, user?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const isDemo = player != null && (player.id === "1" || player.id === PLAYER_MARK_GOLYSH.id);
  const p = isDemo ? PLAYER_MARK_GOLYSH.profile : null;
  const ai = isDemo ? PLAYER_MARK_GOLYSH.aiCoachReport : null;

  if (loading) {
    return (
      <FlagshipScreen
        background={<PassportBackground />}
        header={<PassportHeader onBack={goBack} />}
      >
        <PassportSkeleton />
      </FlagshipScreen>
    );
  }

  if (!player) {
    const isNotFound = profileError === "not_found";
    return (
      <FlagshipScreen
        background={<PassportBackground />}
        header={<PassportHeader onBack={goBack} />}
        scroll={false}
      >
        <ErrorStateView
          variant={isNotFound ? "notFound" : "network"}
          title={isNotFound ? "Игрок не найден" : "Ошибка загрузки"}
          subtitle={
            isNotFound
              ? "Проверьте ссылку или выберите другого игрока"
              : "Проверьте соединение и попробуйте снова"
          }
          onAction={loadProfile}
          style={styles.errorContainer}
        />
      </FlagshipScreen>
    );
  }

  const fullName = player.name ?? "—";
  const parts = fullName.split(" ").filter(Boolean);
  const lastName = parts[0] ?? "";
  const firstName = parts[1] ?? fullName;

  return (
    <FlagshipScreen
      background={<PassportBackground />}
      header={
        <PassportHeader
          onBack={goBack}
          onShare={openShareSheet}
          showShareButton
        />
      }
      footer={
        <SharePlayerSheet
          visible={shareSheetVisible}
          onClose={() => setShareSheetVisible(false)}
          name={player.name ?? "Игрок"}
          position={player.position ?? p?.position}
          team={player.team ?? p?.team}
          number={player.number ?? p?.number}
          age={player.age ?? (isDemo ? PLAYER_AGE : undefined)}
          city={p?.city}
          photo={isDemo ? { uri: DEMO_PLAYER.image } : null}
          stats={
            stats
              ? {
                  games: stats.games,
                  goals: stats.goals,
                  assists: stats.assists,
                  points: stats.points,
                }
              : undefined
          }
        />
      }
    >
          <Animated.View
            entering={screenReveal(0)}
          >
            <PlayerPassportHeader
            photo={isDemo ? { uri: DEMO_PLAYER.image } : null}
            fullName={fullName}
            firstName={firstName}
            lastName={lastName}
            team={player.team ?? p?.team}
            position={player.position ?? p?.position}
            number={player.number ?? p?.number}
            age={player.age ?? (isDemo ? PLAYER_AGE : undefined)}
            birthYear={player.birthYear ?? p?.birthYear}
            playerId={player.id}
              verified={true}
            />
          </Animated.View>

          {/* A. Identity */}
          <Animated.View
            entering={screenReveal(STAGGER)}
          >
            <PassportInfoCard title="Личные данные" style={styles.sectionCard}>
              <PassportFieldRow label="Имя" value={firstName} />
              <PassportFieldRow label="Фамилия" value={lastName} />
              <PassportFieldRow label="Дата рождения" value={p?.birthDate} />
              <PassportFieldRow label="Возраст" value={player.age ?? (isDemo ? String(PLAYER_AGE) : undefined)} />
              <PassportFieldRow label="Город" value={p?.city ?? undefined} />
              <PassportFieldRow label="Страна" value={p?.country ?? undefined} last />
            </PassportInfoCard>
          </Animated.View>

          {/* B. Hockey profile */}
          <Animated.View
            entering={screenReveal(STAGGER * 2)}
          >
            <PassportInfoCard title="Хоккейный профиль" style={styles.sectionCard}>
              <PassportFieldRow label="Позиция" value={p?.position ? (POSITION_MAP[p.position] ?? p.position) : player.position} />
              <PassportFieldRow label="Хват" value={p?.shoots === "Left" ? "Левый" : p?.shoots === "Right" ? "Правый" : p?.shoots} />
              <PassportFieldRow label="Номер" value={player.number ?? p?.number} />
              <PassportFieldRow label="Команда" value={player.team ?? p?.team} />
              <PassportFieldRow label="Лига" value={p?.league} last />
            </PassportInfoCard>
          </Animated.View>

          {/* C. Physical */}
          {(p?.height || p?.weight) && (
            <Animated.View
              entering={screenReveal(STAGGER * 3)}
            >
              <PassportInfoCard title="Физические данные" style={styles.sectionCard}>
                <PassportFieldRow label="Рост" value={p?.height ? `${p.height} см` : undefined} />
                <PassportFieldRow label="Вес" value={p?.weight ? `${p.weight} кг` : undefined} last />
              </PassportInfoCard>
            </Animated.View>
          )}

          {/* D. Passport / Digital ID */}
          <Animated.View
            entering={screenReveal(STAGGER * 4)}
          >
            <PassportInfoCard title="Паспорт" style={styles.sectionCard}>
              <PassportFieldRow label="ID игрока" value={player.id} />
              <PassportFieldRow label="Статус" value="Активен" last />
              <View style={styles.digitalIdZone}>
                <View style={styles.qrFrame}>
                  <Ionicons name="qr-code" size={40} color="rgba(255,255,255,0.12)" />
                </View>
                <Text style={styles.digitalIdLabel}>Цифровой ID</Text>
                <Text style={styles.digitalIdHint}>Готов к QR-проверке</Text>
              </View>
            </PassportInfoCard>
          </Animated.View>

          {/* E. Development */}
          {ai && (ai.strengths?.length || ai.improvements?.length) && (
            <Animated.View
              entering={screenReveal(STAGGER * 5)}
            >
              <PassportInfoCard title="Развитие" style={styles.sectionCard}>
                {ai.strengths?.length ? (
                  <View style={styles.devBlock}>
                    <Text style={styles.devLabel}>Сильные стороны</Text>
                    {ai.strengths.map((s, i) => (
                      <Text key={i} style={styles.devItem}>• {s}</Text>
                    ))}
                  </View>
                ) : null}
                {ai.improvements?.length ? (
                  <View style={styles.devBlock}>
                    <Text style={styles.devLabel}>Зоны роста</Text>
                    {ai.improvements.map((s, i) => (
                      <Text key={i} style={styles.devItem}>• {s}</Text>
                    ))}
                  </View>
                ) : null}
              </PassportInfoCard>
            </Animated.View>
          )}

          {/* F. Achievements */}
          {isDemo && PLAYER_MARK_GOLYSH.achievements?.length ? (
            <Animated.View
              entering={screenReveal(STAGGER * 6)}
            >
              <PassportInfoCard title="Достижения" style={styles.sectionCard}>
                <PassportBadgeRow
                  badges={PLAYER_MARK_GOLYSH.achievements.map((a) => a.title)}
                />
              </PassportInfoCard>
            </Animated.View>
          ) : null}
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  skeletonContent: { gap: spacing.xl },
  skeletonHeader: { borderRadius: 20, marginBottom: spacing.sm },
  skeletonCard: { borderRadius: 20 },
  errorContainer: {
    flex: 1,
  },
  sectionCard: {
    borderColor: colors.surfaceLevel1Border,
    ...shadows.level1,
    marginBottom: spacing.xl,
  },
  digitalIdZone: {
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    alignItems: "center",
  },
  qrFrame: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  digitalIdLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginTop: spacing.md,
  },
  digitalIdHint: {
    fontSize: 10,
    color: colors.textMuted,
    opacity: 0.8,
    marginTop: 2,
  },
  devBlock: { marginBottom: spacing.lg },
  devLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  devItem: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  bottomSpacer: { height: spacing.xxl },
});
