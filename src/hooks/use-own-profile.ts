import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useAuthSession } from '@/hooks/use-auth-session';
import { fetchOwnProfile, type OwnProfile } from '@/lib/profile';

export function useOwnProfile() {
  const { session } = useAuthSession();
  const userId = session?.user.id;
  const [profile, setProfile] = useState<OwnProfile | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return;
    }

    const result = await fetchOwnProfile(userId);
    if (result.profile) {
      setProfile(result.profile);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return profile;
}
