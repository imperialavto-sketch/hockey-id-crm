import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  ImageSourcePropType,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { PlayerCardReveal, type PlayerCardRevealData } from "./PlayerCardReveal";
import { PlayerCardHero } from "./PlayerCardHero";
import {
  type CardRarity,
  CARD_RARITY_STYLES,
} from "@/constants/cardRarity";
import { PlayerInfoGlass } from "./PlayerInfoGlass";
import { PlayerStatsGlass } from "./PlayerStatsGlass";
import { PlayerAttributesGlass } from "./PlayerAttributesGlass";
import { PlayerCardActions } from "./PlayerCardActions";

const { width } = Dimensions.get("window");
const CARD_SECTION_MIN = 520;

export type PlayerCardExperienceData = PlayerCardRevealData;

interface PlayerCardExperienceProps {
  data: PlayerCardRevealData;
  cardImage?: ImageSourcePropType;
  usePreMadeCard?: boolean;
  rarity?: CardRarity;
  onShare?: () => void;
  onSave?: () => void;
  onGenerate?: () => void;
}

export function PlayerCardExperience({
  data,
  cardImage,
  usePreMadeCard = true,
  rarity = "gold",
  onShare,
  onSave,
  onGenerate,
}: PlayerCardExperienceProps) {
  const [revealed, setRevealed] = useState(false);
  const [revealKey, setRevealKey] = useState(0);

  const handleRevealAgain = () => {
    setRevealed(false);
    setRevealKey((k) => k + 1);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardSection}>
          <PlayerCardHero
            animated={revealKey === 0}
            glowColor={CARD_RARITY_STYLES[rarity].glow}
          >
            <PlayerCardReveal
              key={revealKey}
              playerName={data.fullName}
              number={data.number}
              position={data.position}
              cardImage={cardImage}
              usePreMadeCard={usePreMadeCard}
              playerData={usePreMadeCard ? undefined : data}
              rarity={rarity}
              onRevealComplete={() => setRevealed(true)}
            />
          </PlayerCardHero>
        </View>

        {revealed && (
          <>
            <Animated.View
              entering={FadeInDown.delay(200).duration(500).springify()}
              style={styles.panel}
            >
              <PlayerInfoGlass
                fullName={data.fullName}
                number={data.number}
                position={data.position}
                birthYear={data.birthYear}
                team={data.team}
              />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(350).duration(500).springify()}
              style={styles.panel}
            >
              <PlayerStatsGlass
                games={data.stats.games}
                goals={data.stats.goals}
                assists={data.stats.assists}
                points={data.stats.points}
              />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(450).duration(500).springify()}
              style={styles.panel}
            >
              <PlayerAttributesGlass
                skating={data.attributes.skating}
                shooting={data.attributes.shooting}
                passing={data.attributes.passing}
                hockeyIQ={data.attributes.hockeyIQ}
                defense={data.attributes.defense}
                strength={data.attributes.strength}
              />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(550).duration(500).springify()}
              style={styles.actionsPanel}
            >
              <PlayerCardActions
                onShare={onShare}
                onSave={onSave}
                onGenerate={onGenerate}
                onRevealAgain={handleRevealAgain}
              />
            </Animated.View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  cardSection: {
    minHeight: CARD_SECTION_MIN,
    marginBottom: 28,
  },
  panel: {
    marginBottom: 20,
  },
  actionsPanel: {
    marginTop: 8,
    marginBottom: 32,
  },
});
