/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, Tokens, type ThemeName } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function resolveThemeName(scheme: string | null | undefined): ThemeName {
  return scheme === 'dark' ? 'dark' : 'light';
}

export function useThemeName(): ThemeName {
  return resolveThemeName(useColorScheme());
}

/** Flat starter palette — keep for ThemedText / ThemedView. */
export function useTheme() {
  return Colors[useThemeName()];
}

/** Nested TYS Design System tokens (Phase 0). */
export function useThemeTokens() {
  return Tokens[useThemeName()];
}
