/**
 * Hockey ID Coach — Premium dark hockey-style theme
 */

import type { ViewStyle } from 'react-native';

export const theme = {
  colors: {
    background: '#0a0e14',
    surface: '#121920',
    surfaceElevated: '#1a222d',
    card: '#151d28',
    cardBorder: 'rgba(255, 255, 255, 0.06)',
    primary: '#00d4aa',
    primaryMuted: 'rgba(0, 212, 170, 0.15)',
    accent: '#4a9eff',
    accentMuted: 'rgba(74, 158, 255, 0.12)',
    text: '#f0f4f8',
    textSecondary: '#8b9cad',
    textMuted: '#5c6d7e',
    border: 'rgba(255, 255, 255, 0.08)',
    tabIconDefault: '#5c6d7e',
    tabIconSelected: '#00d4aa',
    success: '#00d4aa',
    warning: '#f5a623',
    error: '#ff4d6a',
    /** Muted warning surfaces (pills, borders) */
    warningMuted: 'rgba(245, 166, 35, 0.18)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  /** Вертикальный ритм между крупными блоками на экране */
  layout: {
    sectionGap: 24,
    heroBottom: 24,
    screenBottom: 48,
  },
  typography: {
    hero: {
      fontSize: 28,
      fontWeight: '700' as const,
      letterSpacing: -0.5,
      lineHeight: 34,
    },
    title: {
      fontSize: 20,
      fontWeight: '600' as const,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: '500' as const,
    },
    body: {
      fontSize: 15,
      fontWeight: '400' as const,
    },
    caption: {
      fontSize: 13,
      fontWeight: '400' as const,
    },
    /** Единый kicker под hero (eyebrow) на всех экранах */
    heroEyebrow: {
      fontSize: 12,
      fontWeight: '700' as const,
      letterSpacing: 0.45,
      textTransform: 'uppercase' as const,
    },
  },
  safeArea: {
    top: 44,
    bottom: 34,
  },
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    cardSubtle: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
  },
} as const;

export type Theme = typeof theme;

/** Stack `contentStyle` for coach navigator screens (matches app background). */
export const coachStackContentStyle: ViewStyle = {
  backgroundColor: theme.colors.background,
};
