import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { type Href, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Avatar, Button, EmptyState, Header, Input, Screen, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useThemeTokens } from '@/hooks/use-theme';
import { openProfile } from '@/lib/navigation';
import { searchPublicContent, type SearchResults } from '@/lib/search';
import { formatRelativeTime } from '@/lib/time';
import type { Post, ProfilePreview } from '@/types/post';

type SearchItem =
  | { type: 'profile'; id: string; profile: ProfilePreview }
  | { type: 'post'; id: string; post: Post };

export default function SearchScreen() {
  const tokens = useThemeTokens();
  const { session } = useAuthSession();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle'
  );
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResults>({
    profiles: [],
    posts: [],
  });

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults({ profiles: [], posts: [] });
      setStatus(debounced.length === 0 ? 'idle' : 'ready');
      setError(null);
      return;
    }

    let active = true;
    setStatus('loading');

    searchPublicContent(debounced)
      .then((next) => {
        if (!active) {
          return;
        }
        setResults(next);
        setError(null);
        setStatus('ready');
      })
      .catch((caught) => {
        if (!active) {
          return;
        }
        setError(
          caught instanceof Error
            ? caught.message
            : 'Não foi possível pesquisar.'
        );
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [debounced]);

  const items: SearchItem[] = [
    ...results.profiles.map((profile) => ({
      type: 'profile' as const,
      id: `profile-${profile.id}`,
      profile,
    })),
    ...results.posts.map((post) => ({
      type: 'post' as const,
      id: `post-${post.id}`,
      post,
    })),
  ];

  function renderEmpty() {
    if (status === 'idle') {
      return (
        <EmptyState
          title="Procura na TYS"
          description="Encontra contas e histórias. Escreve pelo menos duas letras."
        />
      );
    }

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
          title="Não foi possível pesquisar"
          description={error ?? 'Tenta novamente dentro de momentos.'}
          action={
            <Button
              variant="secondary"
              onPress={() => setDebounced(query.trim())}
            >
              Tentar novamente
            </Button>
          }
        />
      );
    }

    if (debounced.length < 2) {
      return (
        <EmptyState
          title="Continua a escrever"
          description="A pesquisa começa com duas letras."
        />
      );
    }

    return (
      <EmptyState
        title="Sem resultados"
        description={`Nada encontrado para “${debounced}”.`}
      />
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header title="Pesquisa" showBorder={false} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.searchBar}>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Contas ou histórias"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Pesquisar"
            left={
              <SymbolView
                name={{
                  ios: 'magnifyingglass',
                  android: 'search',
                  web: 'search',
                }}
                size={16}
                tintColor={tokens.text.secondary}
              />
            }
            right={
              query.length > 0 ? (
                <Pressable
                  onPress={() => setQuery('')}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Limpar pesquisa"
                >
                  <SymbolView
                    name={{
                      ios: 'xmark.circle.fill',
                      android: 'cancel',
                      web: 'cancel',
                    }}
                    size={16}
                    tintColor={tokens.text.secondary}
                  />
                </Pressable>
              ) : null
            }
          />
        </View>

        <FlatList
          data={status === 'ready' ? items : []}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={
            status !== 'ready' || items.length === 0
              ? styles.emptyList
              : styles.list
          }
          ListEmptyComponent={renderEmpty}
          ItemSeparatorComponent={() => (
            <View
              style={[styles.separator, { backgroundColor: tokens.border.subtle }]}
            />
          )}
          renderItem={({ item }) =>
            item.type === 'profile' ? (
              <Pressable
                onPress={() => openProfile(item.profile.id, session?.user.id)}
                accessibilityRole="button"
                accessibilityLabel={`Perfil de ${item.profile.displayName ?? item.profile.username}`}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Avatar
                  name={item.profile.displayName ?? item.profile.username}
                  uri={item.profile.avatarUrl}
                  size="sm"
                />
                <View style={styles.rowBody}>
                  <Text variant="meta">
                    {item.profile.displayName ?? item.profile.username}
                  </Text>
                  <Text variant="caption" tone="secondary">
                    @{item.profile.username}
                  </Text>
                </View>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.push(`/post/${item.post.id}` as Href)}
                accessibilityRole="button"
                accessibilityLabel="Abrir publicação"
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View
                  style={[
                    styles.postMark,
                    { backgroundColor: tokens.background.elevated },
                  ]}
                />
                <View style={styles.rowBody}>
                  <Text variant="body" numberOfLines={3}>
                    {item.post.body}
                  </Text>
                  <Text variant="caption" tone="secondary" style={styles.postMeta}>
                    @{item.post.author.username} ·{' '}
                    {formatRelativeTime(item.post.createdAt)}
                  </Text>
                </View>
              </Pressable>
            )
          }
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  searchBar: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
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
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  rowBody: {
    flex: 1,
  },
  postMark: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
  postMeta: {
    marginTop: Spacing.one,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.four,
  },
  pressed: {
    opacity: 0.72,
  },
});
