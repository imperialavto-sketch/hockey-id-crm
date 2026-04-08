/**
 * Короткие сигналы ассистента «Арена»: wake (выше) и stop (ниже) — разные WAV в assets.
 */

import { Audio } from "expo-av";
import { Platform } from "react-native";
import { coachHapticLight, coachHapticSelection } from "@/lib/coachHaptics";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const WAKE_WAV = require("../assets/sounds/arena-wake.wav");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const STOP_WAV = require("../assets/sounds/arena-stop.wav");

let audioModeSet = false;

async function ensureAudioMode(): Promise<void> {
  if (audioModeSet) return;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    audioModeSet = true;
  } catch {
    /* ignore */
  }
}

async function playWav(module: number): Promise<void> {
  try {
    await ensureAudioMode();
    const { sound } = await Audio.Sound.createAsync(module, { shouldPlay: false, volume: 0.9 });
    sound.setOnPlaybackStatusUpdate((st) => {
      if (st.isLoaded && st.didJustFinish) {
        void sound.unloadAsync().catch(() => {});
      }
    });
    await sound.playAsync();
  } catch {
    if (Platform.OS === "android") {
      coachHapticLight();
    }
  }
}

export async function playArenaWakeSound(): Promise<void> {
  await playWav(WAKE_WAV);
  coachHapticLight();
}

export async function playArenaStopSound(): Promise<void> {
  await playWav(STOP_WAV);
  coachHapticSelection();
}
