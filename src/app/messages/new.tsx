import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Avatar, Button, EmptyState, Header, Input, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useThemeTokens } from '@/hooks/use-theme';
import { createOrGetDirectConversation } from '@/lib/messages';
import { openDirectConversation } from '@/lib/navigation';
import { searchProfiles } from '@/lib/search';
import type { ProfilePreview } from '@/types/post';

type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

export default function NewMessageScreen() {
  const tokens = useThemeTokens();
  const { session } = useAuthSession();
  const currentUserId = session?.user.id;
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [profiles, setProfiles] = useState<ProfilePreview[]>([]);
  const [retryToken, setRetryToken] = useState(0);
  const [openingUserId, setOpeningUserId] = useState<string | null>(null);
  const openingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      openingRef.current = false;
      setOpeningUserId(null);
    }, [])
  );

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (debounced.length < 2) {
      setProfiles([]);
      setStatus('idle');
      return;
    }

    let active = true;
    setStatus('loading');

    searchProfiles(debounced, currentUserId)
      .then((next) => {
        if (!active) {
          return;
        }
        setProfiles(next.filter((profile) => profile.id !== currentUserId));
        setStatus('ready');
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setProfiles([]);
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [debounced, currentUserId, retryToken]);

  async function chooseRecipient(userId: string) {
    if (openingRef.current || userId === currentUserId) {
      return;
    }

    openingRef.current = true;
    setOpeningUserId(userId);

    try {
      const conversationId = await createOrGetDirectConversation(userId);
      openDirectConversation(conversationId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível abrir a conversa. Tenta novamente.';
      Alert.alert('Mensagem', message);
      openingRef.current = false;
      setOpeningUserId(null);
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
          title="Não foi possível pesquisar."
          description="Tenta novamente dentro de momentos."
          action={
            <Button
              onPress={() => setRetryToken((current) => current + 1)}
              variant="secondary"
            >
              Tentar novamente
            </Button>
          }
        />
      );
    }

    if (status === 'ready') {
      return (
        <EmptyState
          title="Nenhuma pessoa encontrada."
          description="Tenta outro nome ou username."
        />
      );
    }

    return (
      <EmptyState
        title="Quem queres contactar?"
        description={
          query.trim().length > 0
            ? 'Escreve pelo menos duas letras.'
            : 'Procura pelo nome ou pelo username.'
        }
      />
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        title="Nova mensagem"
        onBack={() => router.back()}
        showBorder={false}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.toRow}>
          <Text variant="meta" tone="secondary">
            Para:
          </Text>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Nome ou username"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Destinatário"
            editable={!openingUserId}
            containerStyle={styles.field}
          />
        </View>
        <FlatList
          data={status === 'ready' ? profiles : []}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={
            status !== 'ready' || profiles.length === 0
              ? styles.emptyList
              : styles.list
          }
          ListEmptyComponent={renderEmpty}
          ItemSeparatorComponent={() => (
            <View
              style={[styles.separator, { backgroundColor: tokens.border.subtle }]}
            />
          )}
          renderItem={({ item }) => {
            const name = item.displayName ?? item.username;
            const opening = openingUserId === item.id;

            return (
              <Pressable
                onPress={() => {
                  void chooseRecipient(item.id);
                }}
                disabled={Boolean(openingUserId)}
                accessibilityRole="button"
                accessibilityLabel={`Enviar mensagem a ${name}`}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Avatar name={name} uri={item.avatarUrl} size="md" />
                <View style={styles.rowBody}>
                  <Text variant="meta" numberOfLines={1}>
                    {name}
                  </Text>
                  <Text variant="caption" tone="secondary" numberOfLines={1}>
                    @{item.username}
                  </Text>
                </View>
                {opening ? (
                  <ActivityIndicator color={tokens.accent.teal.default} />
                ) : null}
              </Pressable>
            );
          }}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  toRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  field: {
    flex: 1,
  },
  list: {
    paddingBottom: Spacing.five,
  },
  emptyList: {
    flexGrow: 1,
  },
  loading: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 72,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  rowBody: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.four + 44 + Spacing.three,
  },
  pressed: {
    opacity: 0.72,
  },
});
