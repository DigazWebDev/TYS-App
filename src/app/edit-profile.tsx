import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Header, Input, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAndroidKeyboardOverlap } from '@/hooks/use-android-keyboard-overlap';
import { useAuthSession } from '@/hooks/use-auth-session';
import { DISPLAY_NAME_MAX_LENGTH } from '@/lib/identity';
import { fetchOwnProfile, updateOwnProfile } from '@/lib/profile';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const keyboardOverlap = useAndroidKeyboardOverlap();
  const { session } = useAuthSession();
  const userId = session?.user.id;
  const hydrated = useRef(false);
  const savingRef = useRef(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId || hydrated.current) {
      return;
    }

    let active = true;

    fetchOwnProfile(userId).then((result) => {
      if (!active || hydrated.current) {
        return;
      }

      if (!result.profile) {
        setError('Não foi possível carregar o perfil.');
        return;
      }

      hydrated.current = true;
      setDisplayName(result.profile.display_name ?? '');
      setUsername(result.profile.username);
      setReady(true);
    });

    return () => {
      active = false;
    };
  }, [userId]);

  async function save() {
    if (savingRef.current) {
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setError(null);

    try {
      const result = await updateOwnProfile(displayName, username);
      if (result.error || !result.profile) {
        setError(result.error ?? 'Não foi possível guardar o perfil. Tenta novamente.');
        return;
      }

      router.back();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const keyboardLift = Math.max(0, keyboardOverlap - insets.bottom);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header title="Editar perfil" onBack={() => router.back()} showBorder={false} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, Spacing.four) + keyboardLift },
        ]}
      >
        <Text variant="body" tone="secondary">
          O nome é como apareces. O username é único e fica visível com @.
        </Text>

        <Input
          value={displayName}
          onChangeText={(next) => {
            setDisplayName(next);
            if (error) {
              setError(null);
            }
          }}
          placeholder="Nome"
          autoCapitalize="words"
          autoCorrect
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          editable={!saving}
          accessibilityLabel="Nome"
        />

        <Input
          value={username}
          onChangeText={(next) => {
            setUsername(next);
            if (error) {
              setError(null);
            }
          }}
          placeholder="username"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!saving}
          accessibilityLabel="Username"
        />

        <Text variant="caption" tone="secondary">
          3 a 32 caracteres: letras minúsculas, números e _. Sem espaços.
        </Text>

        {error ? <Text variant="caption">{error}</Text> : null}

        <Button
          onPress={() => {
            void save();
          }}
          loading={saving}
          disabled={!ready || saving}
          accessibilityLabel="Guardar perfil"
        >
          Guardar
        </Button>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
});
