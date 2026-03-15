/**
 * Shared haptic feedback helper for flagship screens.
 */
export function triggerHaptic(): void {
  try {
    const Haptics = require("expo-haptics");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics not available (web, simulator, or package not installed)
  }
}
