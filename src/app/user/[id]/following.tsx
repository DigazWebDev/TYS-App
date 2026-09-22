import { useLocalSearchParams } from 'expo-router';

import { FollowList } from '@/components/social/FollowList';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function FollowingScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();

  return <FollowList profileId={firstParam(id)} direction="following" />;
}
