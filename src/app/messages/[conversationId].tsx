import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MessageBubble } from '@/components/messages/MessageBubble';
import { Avatar, Button, EmptyState, Header, Input, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAndroidChatKeyboardInset } from '@/hooks/use-android-chat-keyboard';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useThemeTokens } from '@/hooks/use-theme';
import { publicLabel } from '@/lib/identity';
import {
  getConversationMessages,
  getDirectConversation,
  isUserId,
  MESSAGE_BODY_MAX_LENGTH,
  normalizeMessageBody,
  sendMessage,
  validateMessageBody,
  type ChatParticipant,
  type DirectMessage,
} from '@/lib/messages';
import { openProfile } from '@/lib/navigation';

type ScreenStatus = 'loading' | 'ready' | 'unavailable' | 'error';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function mergeChronological(
  incoming: DirectMessage[],
  current: DirectMessage[]
) {
  const byId = new Map<string, DirectMessage>();

  for (const message of incoming) {
    byId.set(message.id, message);
  }

  for (const message of current) {
    if (!byId.has(message.id)) {
      byId.set(message.id, message);
    }
  }

  return [...byId.values()].sort((left, right) => {
    if (left.createdAt === right.createdAt) {
      return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    }

    return left.createdAt < right.createdAt ? -1 : 1;
  });
}

export default function ConversationScreen() {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();
  const chatKeyboard = useAndroidChatKeyboardInset();
  const { conversationId: conversationParam } = useLocalSearchParams<{
    conversationId: string | string[];
  }>();
  const conversationId = firstParam(conversationParam);
  const routeIsValid = Boolean(conversationId && isUserId(conversationId));
  const { session } = useAuthSession();
  const currentUserId = session?.user.id;
  const listRef = useRef<FlatList<DirectMessage>>(null);

  const [participant, setParticipant] = useState<ChatParticipant | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [status, setStatus] = useState<ScreenStatus>(
    routeIsValid ? 'loading' : 'unavailable'
  );
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const sendingRef = useRef(false);
  const loadedIdRef = useRef<string | null>(null);
  const stickToEndRef = useRef(true);

  const trimmedLength = normalizeMessageBody(draft).length;
  const canSend =
    trimmedLength > 0 && draft.length <= MESSAGE_BODY_MAX_LENGTH && !sending;
  const nearLimit = draft.length >= MESSAGE_BODY_MAX_LENGTH - 40;
  const displayName = participant
    ? publicLabel({
        displayName: participant.displayName,
        username: participant.username,
      })
    : 'Mensagem';

  const load = useCallback(async () => {
    if (!conversationId || !isUserId(conversationId)) {
      loadedIdRef.current = null;
      setStatus('unavailable');
      setParticipant(null);
      setMessages([]);
      return;
    }

    const sameConversation = loadedIdRef.current === conversationId;
    if (!sameConversation) {
      setStatus('loading');
      setParticipant(null);
      setMessages([]);
    }

    const conversation = await getDirectConversation(conversationId);
    if (conversation.unavailable) {
      loadedIdRef.current = null;
      setParticipant(null);
      setMessages([]);
      setStatus('unavailable');
      return;
    }

    if (conversation.error || !conversation.participant) {
      if (!sameConversation) {
        setStatus('error');
      }
      return;
    }

    const history = await getConversationMessages(conversationId);
    if (history.error) {
      if (!sameConversation) {
        setStatus('error');
      }
      return;
    }

    setParticipant(conversation.participant);
    setMessages((current) =>
      sameConversation
        ? mergeChronological(history.messages, current)
        : history.messages
    );
    setStatus('ready');
    loadedIdRef.current = conversationId;
    stickToEndRef.current = true;
  }, [conversationId]);

  useEffect(() => {
    if (chatKeyboard.inset === 0 || messages.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
    });
  }, [chatKeyboard.inset, messages.length]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function refresh() {
    if (loadedIdRef.current !== conversationId) {
      return;
    }
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function handleChange(next: string) {
    setDraft(next);
    if (draftError) {
      setDraftError(null);
    }
  }

  async function handleSend() {
    if (!conversationId || !isUserId(conversationId) || sendingRef.current) {
      return;
    }

    const validationError = validateMessageBody(draft);
    if (validationError) {
      setDraftError(validationError);
      return;
    }

    sendingRef.current = true;
    setSending(true);

    try {
      const result = await sendMessage(conversationId, draft);
      if (result.error || !result.message) {
        setDraftError(result.error ?? 'Não foi possível enviar a mensagem. Tenta novamente.');
        return;
      }

      const created = result.message;
      setDraft('');
      setDraftError(null);
      stickToEndRef.current = true;
      setMessages((current) =>
        current.some((message) => message.id === created.id)
          ? current
          : [...current, created]
      );
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } finally {
      sendingRef.current = false;
      setSending(false);
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

    if (status === 'unavailable') {
      return (
        <EmptyState
          title="Conversa indisponível"
          description="Não encontrámos esta conversa."
        />
      );
    }

    if (status === 'error') {
      return (
        <EmptyState
          title="Não foi possível carregar a conversa."
          description="Tenta novamente dentro de momentos."
          action={
            <Button onPress={() => void load()} variant="secondary">
              Tentar novamente
            </Button>
          }
        />
      );
    }

    return (
      <View style={styles.quietEmpty}>
        <Text variant="body" tone="secondary" style={styles.quietText}>
          Ainda não há mensagens.
        </Text>
        <Text variant="body" tone="secondary" style={styles.quietText}>
          Começa a conversa.
        </Text>
      </View>
    );
  }

  const messagePane = (
    <>
      <FlatList
        ref={listRef}
        style={styles.flex}
        data={status === 'ready' ? messages : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            body={item.body}
            createdAt={item.createdAt}
            isOwn={item.authorId === currentUserId}
          />
        )}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          messages.length === 0 || status !== 'ready'
            ? styles.emptyList
            : styles.list
        }
        refreshControl={
          status === 'ready' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void refresh();
              }}
              tintColor={tokens.accent.teal.default}
              colors={[tokens.accent.teal.default]}
            />
          ) : undefined
        }
        onContentSizeChange={() => {
          if (stickToEndRef.current && messages.length > 0) {
            listRef.current?.scrollToEnd({ animated: false });
            stickToEndRef.current = false;
          }
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        showsVerticalScrollIndicator={false}
      />

      {status === 'ready' ? (
        <View
          style={[
            styles.composer,
            {
              paddingBottom:
                chatKeyboard.inset > 0
                  ? Spacing.two
                  : Math.max(insets.bottom, Spacing.three),
            },
          ]}
        >
          <View style={styles.composerRow}>
            <Input
              value={draft}
              onChangeText={handleChange}
              placeholder="Mensagem"
              multiline
              maxLength={MESSAGE_BODY_MAX_LENGTH}
              invalid={Boolean(draftError)}
              editable={!sending}
              accessibilityLabel="Mensagem"
              autoCapitalize="sentences"
              containerStyle={styles.composerInput}
              style={styles.composerField}
            />
            <Button
              onPress={() => {
                void handleSend();
              }}
              loading={sending}
              disabled={!canSend}
              accessibilityLabel="Enviar mensagem"
              style={styles.send}
            >
              Enviar
            </Button>
          </View>
          {draftError || nearLimit ? (
            <View style={styles.metaRow}>
              <Text variant="caption" style={styles.hint}>
                {draftError ?? ''}
              </Text>
              <Text
                variant="caption"
                tone={nearLimit ? 'accent' : 'secondary'}
                style={styles.counter}
              >
                {draft.length}/{MESSAGE_BODY_MAX_LENGTH}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </>
  );

  return (
    <Screen edges={['top', 'left', 'right']}>
      {status === 'ready' && participant ? (
        <Header
          showBorder={false}
          left={
            <View style={styles.identity}>
              <Pressable
                onPress={() => router.back()}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Voltar"
                style={styles.back}
              >
                <SymbolView
                  name={{
                    ios: 'chevron.left',
                    android: 'chevron_left',
                    web: 'chevron_left',
                  }}
                  size={18}
                  weight="semibold"
                  tintColor={tokens.text.primary}
                />
              </Pressable>
              <Pressable
                onPress={() => openProfile(participant.id, currentUserId)}
                accessibilityRole="button"
                accessibilityLabel={`Abrir perfil de ${displayName}`}
                style={styles.person}
              >
                <Avatar
                  name={displayName}
                  uri={participant.avatarUrl}
                  size="sm"
                />
                <Text numberOfLines={1} style={styles.personName}>
                  {displayName}
                </Text>
              </Pressable>
            </View>
          }
        />
      ) : (
        <Header
          title="Mensagem"
          onBack={() => router.back()}
          showBorder={false}
        />
      )}

      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          {messagePane}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.flex} onLayout={chatKeyboard.onLayout}>
          <View
            style={[
              styles.flex,
              chatKeyboard.inset > 0 && { paddingBottom: chatKeyboard.inset },
            ]}
          >
            {messagePane}
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 280,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  personName: {
    flexShrink: 1,
  },
  list: {
    paddingTop: Spacing.three,
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
  quietEmpty: {
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.one,
  },
  quietText: {
    textAlign: 'center',
  },
  composer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  composerInput: {
    flex: 1,
    minHeight: 52,
    maxHeight: 120,
    paddingVertical: Spacing.two,
  },
  composerField: {
    maxHeight: 96,
  },
  send: {
    minWidth: 96,
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
});
