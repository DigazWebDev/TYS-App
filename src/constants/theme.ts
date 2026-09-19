/**
 * TYS Design System v1 — tokens.
 * Nested semantic colors are the source of truth. `Colors` stays a flat
 * alias map so existing ThemedText / ThemedView consumers keep compiling.
 */

import '@/global.css';

import { Platform, type TextStyle } from 'react-native';

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const satisfies Record<string, NonNullable<TextStyle['fontWeight']>>;

/**
 * Teal is the brand accent (CTA, links, focus).
 * Nardo Grey remains available for structural chrome (avatars, rings).
 */
const Signature = {
  nardo: {
    light: '#5C6166',
    dark: '#B4B8BC',
  },
  teal: {
    light: {
      default: '#0E8F86',
      pressed: '#0B716B',
      muted: '#E8F1F0',
    },
    dark: {
      default: '#2BB8A8',
      pressed: '#229184',
      muted: '#102824',
    },
  },
} as const;

export const Tokens = {
  light: {
    background: {
      canvas: '#F8FAFA',
      surface: '#FFFFFF',
      elevated: '#EEF1F2',
    },
    text: {
      primary: '#111213',
      secondary: '#6A7178',
      inverse: '#FFFFFF',
      accent: Signature.teal.light.default,
      onAccent: '#FFFFFF',
    },
    border: {
      subtle: '#E2E5E8',
      strong: '#111213',
    },
    accent: {
      nardo: Signature.nardo.light,
      teal: Signature.teal.light,
    },
  },
  dark: {
    background: {
      canvas: '#0B0E10',
      surface: '#161A1C',
      elevated: '#1E2326',
    },
    text: {
      primary: '#F4F6F6',
      secondary: '#A8B0B4',
      inverse: '#111213',
      accent: Signature.teal.dark.default,
      onAccent: '#FFFFFF',
    },
    border: {
      subtle: '#2A3033',
      strong: '#F4F6F6',
    },
    accent: {
      nardo: Signature.nardo.dark,
      teal: Signature.teal.dark,
    },
  },
} as const;

export type ThemeName = keyof typeof Tokens;
export type ThemeTokens = (typeof Tokens)[ThemeName];

/**
 * Flat palette used by the Expo starter primitives (`ThemedText`, `ThemedView`).
 * Mapped from Tokens so template screens keep working without edits.
 */
export const Colors = {
  light: {
    text: Tokens.light.text.primary,
    background: Tokens.light.background.canvas,
    backgroundElement: Tokens.light.background.surface,
    backgroundSelected: Tokens.light.background.elevated,
    textSecondary: Tokens.light.text.secondary,
  },
  dark: {
    text: Tokens.dark.text.primary,
    background: Tokens.dark.background.canvas,
    backgroundElement: Tokens.dark.background.surface,
    backgroundSelected: Tokens.dark.background.elevated,
    textSecondary: Tokens.dark.text.secondary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Typography = {
  wordmark: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: FontWeight.heavy,
    letterSpacing: -1.4,
  },
  hero: {
    fontSize: 52,
    lineHeight: 58,
    fontWeight: FontWeight.regular,
    letterSpacing: 0.8,
  },
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.8,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: FontWeight.regular,
    letterSpacing: 0,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.15,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: FontWeight.regular,
    letterSpacing: 0.2,
  },
  overline: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: FontWeight.semibold,
    letterSpacing: 2.2,
  },
} as const satisfies Record<string, TextStyle>;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
