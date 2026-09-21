import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { ConversationRow } from '@/components/messages/ConversationRow';
import { ConversationSkeleton } from '@/components/messages/ConversationSkeleton';
import { Button, EmptyState, Header, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';
import { publicLabel } from '@/lib/identity';
import {
  getInboxConversations,
  type InboxConversation,
} from '@/lib/messages';
import { openDirectConversation, openNewMessage } from '@/lib/navigation';
import { formatCompactTimestamp } from '@/lib/time';

type InboxStatus = 'loading' | 'ready' | 'error';

const EMPTY_PREVIEW = 'Começa a conversa';

export default function MessagesScreen() {
  const tokens = useThemeTokens();
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [status, setStatus] = useState<InboxStatus>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const openingRef = useRef(false);

  const load = useCallback(async (mode: 'initial' | 'focus' | 'pull') => {
    if (mode === 'pull') {
      setRefreshing(true);
    } else if (!hasLoadedRef.current) {
      setStatus('loading');
    }

    const result = await getInboxConversations();

    if (result.error) {
      if (!hasLoadedRef.current) {
        setConversations([]);
        setStatus('error');
      }
    } else {
      setConversations(result.conversations);
      setStatus('ready');
      hasLoadedRef.current = true;
    }

    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      openingRef.current = false;
      void load(hasLoadedRef.current ? 'focus' : 'initial');
    }, [load])
  );

  function openConversation(conversationId: string) {
    if (openingRef.current) {
      return;
    }
    openingRef.current = true;
    openDirectConversation(conversationId);
  }

  function openComposer() {
    if (openingRef.current) {
      return;
    }
    openingRef.current = true;
    openNewMessage();
  }

  function renderEmpty() {
    if (status === 'loading') {
      return <ConversationSkeleton />;
    }

    if (status === 'error') {
      return (
        <EmptyState
          title="Não foi possível carregar as conversas."
          description="Tenta novamente dentro de momentos."
          action={
            <Button onPress={() => void load('initial')} variant="secondary">
              Tentar novamente
            </Button>
          }
        />
      );
    }

    return (
      <EmptyState
        title="Ainda não tens conversas."
        description="Começa uma nova conversa."
        action={<Button onPress={openComposer}>Nova mensagem</Button>}
      />
    );
  }

  const showRows = status === 'ready';

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        title="Mensagens"
        showBorder={false}
        right={
          <Pressable
            onPress={openComposer}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Nova mensagem"
            style={styles.compose}
          >
            <SymbolView
              name={{
                ios: 'square.and.pencil',
                android: 'edit',
                web: 'edit',
              }}
              size={20}
              tintColor={tokens.text.primary}
            />
          </Pressable>
        }
      />
      <FlatList
        data={showRows ? conversations : []}
        keyExtractor={(item) => item.conversationId}
        renderItem={({ item }) => {
          const name = publicLabel({
            displayName: item.otherUser.displayName,
            username: item.otherUser.username,
          });
          return (
            <ConversationRow
              name={name}
              handle={
                item.otherUser.displayName && item.otherUser.username
                  ? item.otherUser.username
                  : null
              }
              avatarUrl={item.otherUser.avatarUrl}
              preview={item.lastMessage?.body ?? EMPTY_PREVIEW}
              placeholder={!item.lastMessage}
              timestamp={formatCompactTimestamp(item.updatedAt)}
              onPress={() => openConversation(item.conversationId)}
            />
          );
        }}
        ItemSeparatorComponent={() => (
          <View
            style={[styles.separator, { backgroundColor: tokens.border.subtle }]}
          />
        )}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void load('pull');
            }}
            tintColor={tokens.accent.teal.default}
            colors={[tokens.accent.teal.default]}
          />
        }
        contentContainerStyle={
          showRows && conversations.length > 0 ? styles.list : styles.emptyList
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: Spacing.five,
  },
  emptyList: {
    flexGrow: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.four + 44 + Spacing.three,
  },
  compose: {
    width: 40,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
