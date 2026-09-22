import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { Avatar, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';
import { publicLabel } from '@/lib/identity';
import type { ProfilePreview } from '@/types/post';

type StoryBubbleProps = {
  profile: ProfilePreview;
  viewed?: boolean;
  isOwn?: boolean;
  hasStory?: boolean;
  onPress: () => void;
};

export function StoryBubble({
  profile,
  viewed = false,
  isOwn = false,
  hasStory = false,
  onPress,
}: StoryBubbleProps) {
  const tokens = useThemeTokens();
  const label = publicLabel(profile);
  const ringColor = isOwn
    ? hasStory
      ? tokens.accent.teal.default
      : tokens.border.subtle
    : viewed
      ? tokens.border.subtle
      : tokens.accent.teal.default;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        isOwn ? (hasStory ? 'As tuas stories' : 'Criar story') : `Story de ${label}`
      }
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.ring,
          {
            borderColor: ringColor,
            borderWidth: viewed && !isOwn ? 1 : 2,
          },
        ]}
      >
        <Avatar name={label} uri={profile.avatarUrl} size="lg" />
        {isOwn ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: tokens.accent.teal.default },
            ]}
          >
            <SymbolView
              name={plusIcon}
              size={10}
              tintColor={tokens.text.onAccent}
            />
          </View>
        ) : null}
      </View>
      <Text variant="caption" tone="secondary" numberOfLines={1} style={styles.name}>
        {isOwn ? 'A tua story' : label}
      </Text>
    </Pressable>
  );
}

const plusIcon: SymbolViewProps['name'] = {
  ios: 'plus',
  android: 'add',
  web: 'add',
};

const styles = StyleSheet.create({
  item: {
    width: 76,
    alignItems: 'center',
  },
  ring: {
    padding: 2,
    borderRadius: 999,
  },
  badge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    marginTop: Spacing.one,
    textAlign: 'center',
    width: '100%',
  },
  pressed: {
    opacity: 0.72,
  },
});
