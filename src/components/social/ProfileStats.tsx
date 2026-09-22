import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';

type ProfileStatsProps = {
  posts: number;
  followers: number;
  following: number;
  onFollowers: () => void;
  onFollowing: () => void;
};

export function ProfileStats({
  posts,
  followers,
  following,
  onFollowers,
  onFollowing,
}: ProfileStatsProps) {
  return (
    <View style={styles.row}>
      <Stat value={posts} label="Publicações" />
      <Stat
        value={followers}
        label="Seguidores"
        onPress={onFollowers}
        accessibilityLabel={`${followers} seguidores`}
      />
      <Stat
        value={following}
        label="A seguir"
        onPress={onFollowing}
        accessibilityLabel={`${following} a seguir`}
      />
    </View>
  );
}

function Stat({
  value,
  label,
  onPress,
  accessibilityLabel,
}: {
  value: number;
  label: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const content = (
    <View style={styles.stat}>
      <Text variant="title">{value}</Text>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={8}
      style={({ pressed }) => [styles.statPress, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.four,
  },
  stat: {
    alignItems: 'center',
    minWidth: 88,
    gap: Spacing.one,
  },
  statPress: {
    borderRadius: 12,
  },
  pressed: {
    opacity: 0.72,
  },
});
