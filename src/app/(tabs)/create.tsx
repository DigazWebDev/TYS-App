import { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, Header, Input, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuthSession } from '@/hooks/use-auth-session';
import {
  POST_BODY_MAX_LENGTH,
  createPost,
  validatePostBody,
} from '@/lib/posts';

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuthSession();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  const trimmedLength = body.trim().length;
  const canSubmit = trimmedLength > 0 && body.length <= POST_BODY_MAX_LENGTH;
  const nearLimit = body.length >= POST_BODY_MAX_LENGTH - 20;
  const authorName = session?.user.email?.split('@')[0] ?? 'tu';

  function handleChange(next: string) {
    setBody(next);
    if (error) {
      setError(null);
    }
  }

  async function handlePublish() {
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
      <Header title="Criar" showBorder={false} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
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
              @{authorName}
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

          <View style={styles.metaRow}>
            {error ? (
              <Text variant="caption" style={styles.error}>
                {error}
              </Text>
            ) : (
              <Text variant="caption" tone="secondary" style={styles.hint}>
                {trimmedLength === 0
                  ? 'Escreve a tua história.'
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
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
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
    flex: 1,
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
