import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommentRow } from '@/components/feed/CommentRow';
import { Button, EmptyState, Header, Input, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useThemeTokens } from '@/hooks/use-theme';
import {
  COMMENT_BODY_MAX_LENGTH,
  createComment,
  deleteComment,
  getComments,
  validateCommentBody,
} from '@/lib/post-comments';
import type { PostComment } from '@/types/post';

type ScreenStatus = 'loading' | 'ready' | 'error';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function PostCommentsScreen() {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const postId = firstParam(id);
  const { session } = useAuthSession();
  const currentUserId = session?.user.id;
  const listRef = useRef<FlatList<PostComment>>(null);

  const [comments, setComments] = useState<PostComment[]>([]);
  const [status, setStatus] = useState<ScreenStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const submittingRef = useRef(false);
  const deletingRef = useRef(new Set<string>());
  const hasLoadedRef = useRef(false);

  const trimmedLength = draft.trim().length;
  const canSubmit =
    trimmedLength > 0 && draft.length <= COMMENT_BODY_MAX_LENGTH && !submitting;
  const nearLimit = draft.length >= COMMENT_BODY_MAX_LENGTH - 20;

  const load = useCallback(async () => {
    if (!postId) {
      setStatus('error');
      setError('Não encontrámos esta publicação.');
      return;
    }

    if (!hasLoadedRef.current) {
      setStatus('loading');
    }

    const result = await getComments(postId);

    if (result.error) {
      if (hasLoadedRef.current) {
        Alert.alert('Não foi possível atualizar', result.error);
        return;
      }

      setError(result.error);
      setStatus('error');
      return;
    }

    setComments(result.comments);
    setError(null);
    setStatus('ready');
    hasLoadedRef.current = true;
  }, [postId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function handleChange(next: string) {
    setDraft(next);
    if (draftError) {
      setDraftError(null);
    }
  }

  async function handleSubmit() {
    if (!postId) {
      return;
    }

    const validationError = validateCommentBody(draft);
    if (validationError) {
      setDraftError(validationError);
      return;
    }

    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    Keyboard.dismiss();

    try {
      const result = await createComment(postId, draft);

      if (result.error || !result.comment) {
        setDraftError(result.error ?? 'Não foi possível enviar o comentário.');
        return;
      }

      const created = result.comment;
      setDraft('');
      setDraftError(null);
      setComments((current) =>
        current.some((comment) => comment.id === created.id)
          ? current
          : [...current, created]
      );
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch (caught) {
      setDraftError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível enviar o comentário.'
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (deletingRef.current.has(commentId)) {
      return;
    }

    deletingRef.current.add(commentId);
    setDeletingIds((current) => new Set(current).add(commentId));

    try {
      const result = await deleteComment(commentId);

      if (result.error) {
        Alert.alert('Não foi possível apagar', result.error);
        return;
      }

      setComments((current) =>
        current.filter((comment) => comment.id !== commentId)
      );
    } catch (caught) {
      Alert.alert(
        'Não foi possível apagar',
        caught instanceof Error
          ? caught.message
          : 'Tenta novamente dentro de momentos.'
      );
    } finally {
      deletingRef.current.delete(commentId);
      setDeletingIds((current) => {
        const next = new Set(current);
        next.delete(commentId);
        return next;
      });
    }
  }

  function renderEmpty() {
    if (status === 'loading') {
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={tokens.accent.teal.default} />
        </View>
      );
    }

    if (status === 'error') {
      return (
        <EmptyState
          title="Não foi possível carregar"
          description={error ?? 'Tenta novamente dentro de momentos.'}
          action={
            <Button onPress={() => void load()} variant="secondary">
              Tentar novamente
            </Button>
          }
        />
      );
    }

    return (
      <EmptyState
        title="Ainda não há comentários"
        description="Sê o primeiro a continuar esta história."
      />
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        title="Comentários"
        onBack={() => router.back()}
        showBorder={false}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CommentRow
              comment={item}
              canDelete={item.authorId === currentUserId}
              deleting={deletingIds.has(item.id)}
              onDelete={(commentId) => {
                void handleDelete(commentId);
              }}
            />
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={
            comments.length === 0 ? styles.emptyList : styles.list
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        />

        <View
          style={[
            styles.composer,
            { paddingBottom: Math.max(insets.bottom, Spacing.three) },
          ]}
        >
          <Input
            value={draft}
            onChangeText={handleChange}
            placeholder="Escreve um comentário"
            maxLength={COMMENT_BODY_MAX_LENGTH}
            invalid={Boolean(draftError)}
            editable={!submitting}
            accessibilityLabel="Texto do comentário"
            autoCapitalize="sentences"
            returnKeyType="send"
            blurOnSubmit
            onSubmitEditing={() => {
              if (canSubmit) {
                void handleSubmit();
              }
            }}
          />

          <View style={styles.metaRow}>
            {draftError ? (
              <Text variant="caption" style={styles.hint}>
                {draftError}
              </Text>
            ) : (
              <Text variant="caption" tone="secondary" style={styles.hint}>
                {trimmedLength === 0
                  ? 'O teu comentário aparece nesta história.'
                  : 'Envia para toda a gente ver.'}
              </Text>
            )}
            <Text
              variant="caption"
              tone={nearLimit ? 'accent' : 'secondary'}
              style={styles.counter}
            >
              {draft.length}/{COMMENT_BODY_MAX_LENGTH}
            </Text>
          </View>

          <Button
            onPress={() => {
              void handleSubmit();
            }}
            loading={submitting}
            disabled={!canSubmit}
            accessibilityLabel="Enviar comentário"
            style={styles.submit}
          >
            Enviar
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
  list: {
    paddingVertical: Spacing.two,
    paddingBottom: Spacing.three,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loading: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  composer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
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
  counter: {
    fontVariant: ['tabular-nums'],
  },
  submit: {
    marginTop: Spacing.three,
  },
});
