import { useRef, useState } from 'react';
import { Alert, type StyleProp, type ViewStyle } from 'react-native';

import { Button } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import {
  followUser,
  unfollowUser,
  type FollowChangeReason,
} from '@/lib/follows';

type FollowButtonProps = {
  profileId: string;
  label: string;
  following: boolean;
  compact?: boolean;
  busy?: boolean;
  onChange: (following: boolean, reason: FollowChangeReason) => void;
  style?: StyleProp<ViewStyle>;
};

export function FollowButton({
  profileId,
  label,
  following,
  compact = false,
  busy = false,
  onChange,
  style,
}: FollowButtonProps) {
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  async function toggle() {
    if (pendingRef.current || busy) {
      return;
    }

    pendingRef.current = true;
    setPending(true);
    const next = !following;
    onChange(next, 'optimistic');

    const result = next ? await followUser(profileId) : await unfollowUser(profileId);

    if (result.error) {
      onChange(following, 'rollback');
      Alert.alert(next ? 'Seguir' : 'Deixar de seguir', result.error);
    } else if (next && 'alreadyFollowing' in result && result.alreadyFollowing) {
      onChange(true, 'already');
    } else {
      onChange(next, 'confirmed');
    }

    pendingRef.current = false;
    setPending(false);
  }

  return (
    <Button
      variant={following ? 'secondary' : 'primary'}
      loading={pending || busy}
      onPress={() => void toggle()}
      accessibilityLabel={following ? `Deixar de seguir ${label}` : `Seguir ${label}`}
      hitSlop={compact ? 8 : 4}
      style={[compact ? styles.compact : undefined, style]}
    >
      {following ? 'A seguir' : 'Seguir'}
    </Button>
  );
}

const styles = {
  compact: {
    height: 44,
    paddingHorizontal: Spacing.three,
  },
};
