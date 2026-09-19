import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Avatar, Button, Header, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuthSession } from '@/hooks/use-auth-session';
import { supabase } from '@/lib/supabase';

type ProfileRow = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export default function ProfileScreen() {
  const { session } = useAuthSession();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const signingOutRef = useRef(false);

  const fallbackName = session?.user.email?.split('@')[0] ?? 'tu';
  const username = profile?.username ?? fallbackName;
  const displayName = profile?.display_name ?? username;

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      return;
    }

    let active = true;

    supabase
      .from('profiles')
      .select('username, display_name, avatar_url, bio')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) {
          setProfile(data);
        }
      });

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  async function signOut() {
    if (signingOutRef.current) {
      return;
    }

    signingOutRef.current = true;
    setSigningOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      signingOutRef.current = false;
      setSigningOut(false);
      Alert.alert('Erro ao terminar sessão', error.message);
      return;
    }

    router.replace('/login');
  }

  function confirmSignOut() {
    if (signingOutRef.current) {
      return;
    }

    Alert.alert(
      'Terminar sessão',
      'Vais sair da TYS neste dispositivo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Terminar sessão',
          style: 'destructive',
          onPress: () => {
            void signOut();
          },
        },
      ]
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header title="Perfil" showBorder={false} />

      <View style={styles.body}>
        <Avatar name={displayName} uri={profile?.avatar_url} size="xl" />

        <Text variant="title" style={styles.name}>
          {displayName}
        </Text>
        <Text variant="meta" tone="secondary">
          @{username}
        </Text>
        {profile?.bio ? (
          <Text variant="body" tone="secondary" style={styles.bio}>
            {profile.bio}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Button variant="secondary" disabled>
            Editar perfil
          </Button>
          <Button
            variant="ghost"
            loading={signingOut}
            onPress={confirmSignOut}
            accessibilityLabel="Terminar sessão"
          >
            Terminar sessão
          </Button>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  name: {
    marginTop: Spacing.three,
  },
  bio: {
    marginTop: Spacing.two,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    marginTop: Spacing.five,
    gap: Spacing.two,
  },
});
