import { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PostMediaComposer } from '@/components/create/PostMediaComposer';
import { Avatar, Button, Header, Input, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useOwnProfile } from '@/hooks/use-own-profile';
import { publicLabel } from '@/lib/identity';
import type { PostMediaDraft } from '@/lib/post-media-draft';
import {
  POST_BODY_MAX_LENGTH,
  createPost,
  validatePostBody,
} from '@/lib/posts';

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const profile = useOwnProfile();
  const { composer } = useLocalSearchParams<{ composer?: string }>();
  const textOnly = composer !== 'media';
  const [body, setBody] = useState('');
  const [media, setMedia] = useState<PostMediaDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  const trimmedLength = body.trim().length;
  const canSubmit =
    (textOnly ? trimmedLength > 0 : trimmedLength > 0 || media.length > 0) &&
    body.length <= POST_BODY_MAX_LENGTH;
  const nearLimit = body.length >= POST_BODY_MAX_LENGTH - 20;
  const authorName = publicLabel({
    displayName: profile?.display_name,
    username: profile?.username,
  });

  function handleChange(next: string) {
    setBody(next);
    if (error) {
      setError(null);
    }
  }

  function handleMediaChange(next: PostMediaDraft[], notice: string | null) {
    setMedia(next);
    setError(notice);
  }

  async function handlePublish() {
    if (!textOnly && media.length > 0) {
      setError(
        'As fotos e os vídeos ainda não são enviados. O texto e a seleção mantêm-se neste ecrã.',
      );
      return;
    }

    const validationError = validatePostBody(body);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (submitting.current) {
      return;
    }

    submitting.current = true;
    setLoading(true);
    Keyboard.dismiss();

    try {
      const result = await createPost(body);

      if (result.error) {
        setError(result.error);
        Alert.alert('Não foi possível publicar', result.error);
        return;
      }

      setBody('');
      setMedia([]);
      setError(null);
      Alert.alert('Publicado', 'A tua história já está no feed.', [
        {
          text: 'Ver feed',
          onPress: () => {
            router.navigate('/(tabs)');
          },
        },
      ]);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        title="Criar"
        showBorder={false}
        onBack={() => router.navigate('/(tabs)' as Href)}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.body,
            { paddingBottom: Math.max(insets.bottom, Spacing.four) },
          ]}
        >
          <Text variant="overline" tone="secondary">
            CONTA A TUA HISTÓRIA
          </Text>

          <View style={styles.identity}>
            <Avatar name={authorName} size="sm" />
            <Text variant="meta" tone="secondary">
              {profile?.username ? `@${profile.username}` : authorName}
            </Text>
          </View>

          <Input
            multiline
            value={body}
            onChangeText={handleChange}
            placeholder="O que queres contar?"
            maxLength={POST_BODY_MAX_LENGTH}
            invalid={Boolean(error)}
            editable={!loading}
            accessibilityLabel="Texto da publicação"
            autoCorrect
            autoCapitalize="sentences"
            containerStyle={styles.composer}
            style={styles.composerField}
          />

          {textOnly ? null : (
            <PostMediaComposer
              items={media}
              disabled={loading}
              onChange={handleMediaChange}
            />
          )}

          <View style={styles.metaRow}>
            {error ? (
              <Text variant="caption" style={styles.error}>
                {error}
              </Text>
            ) : (
              <Text variant="caption" tone="secondary" style={styles.hint}>
                {textOnly
                  ? trimmedLength === 0
                    ? 'Escreve a tua história.'
                    : 'A publicação aparece no feed de todos.'
                  : media.length > 0
                    ? 'A seleção fica no telemóvel até o envio de media existir.'
                    : trimmedLength === 0
                      ? 'Escreve a tua história ou junta fotos e vídeos.'
                      : 'A publicação aparece no feed de todos.'}
              </Text>
            )}
            <Text
              variant="caption"
              tone={nearLimit ? 'accent' : 'secondary'}
              style={styles.counter}
            >
              {body.length}/{POST_BODY_MAX_LENGTH}
            </Text>
          </View>

          <Button
            onPress={() => {
              void handlePublish();
            }}
            loading={loading}
            disabled={!canSubmit}
            accessibilityLabel="Publicar"
            style={styles.submit}
          >
            Publicar
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  body: {
    flexGrow: 1,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.two,
    paddingBottom: 0,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  composer: {
    minHeight: 160,
  },
  composerField: {
    minHeight: 160,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  hint: {
    flex: 1,
  },
  error: {
    flex: 1,
  },
  counter: {
    fontVariant: ['tabular-nums'],
  },
  submit: {
    marginTop: Spacing.four,
  },
});
