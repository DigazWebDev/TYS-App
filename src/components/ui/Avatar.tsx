import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { FontWeight } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';

import { Text } from './Text';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const AVATAR_SIZE: Record<AvatarSize, number> = {
  sm: 32,
  md: 44,
  lg: 64,
  xl: 96,
};

export type AvatarProps = {
  name?: string;
  uri?: string | null;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
};

function initialsFromName(name?: string) {
  if (!name?.trim()) {
    return '';
  }

  const parts = name.trim().replace(/^@/, '').split(/\s+/);
  const first = parts[0]?.charAt(0) ?? '';
  const second = parts.length > 1 ? parts[1].charAt(0) : '';
  return `${first}${second}`.toUpperCase();
}

export function Avatar({ name, uri, size = 'md', style }: AvatarProps) {
  const tokens = useThemeTokens();
  const dimension = AVATAR_SIZE[size];
  const initials = initialsFromName(name);
  const label = name ? `Avatar de ${name}` : 'Avatar';

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[
        styles.base,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: tokens.accent.nardo,
        },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
          }}
          accessibilityIgnoresInvertColors
        />
      ) : initials ? (
        <Text
          variant={size === 'xl' || size === 'lg' ? 'title' : 'meta'}
          tone="inverse"
          style={styles.initials}
        >
          {initials}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: FontWeight.bold,
  },
});
