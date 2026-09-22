import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { type Href, router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Avatar, Button, EmptyState, Header, Input, Screen, Text } from '@/components/ui';
import { FollowButton } from '@/components/social/FollowButton';
import { Radius, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useThemeTokens } from '@/hooks/use-theme';
import { publicHandle, publicLabel } from '@/lib/identity';
import { fetchFollowedIds, type FollowChangeReason } from '@/lib/follows';
import { openProfile } from '@/lib/navigation';
import { profileSearchTerm, searchPublicContent, type SearchResults } from '@/lib/search';
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
  const [followedIds, setFollowedIds] = useState<ReadonlySet<string>>(() => new Set());
  const changeTick = useRef(0);
  const overrides = useRef(new Map<string, { following: boolean; at: number }>());

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const term = profileSearchTerm(debounced);
    if (term.length < 2) {
      setResults({ profiles: [], posts: [] });
      setStatus(term.length === 0 ? 'idle' : 'ready');
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
      .catch(() => {
        if (!active) {
          return;
        }
        setError('Não foi possível pesquisar.');
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [debounced]);

  useFocusEffect(
    useCallback(() => {
      const ids = results.profiles.map((profile) => profile.id);
      let active = true;
      const startedTick = changeTick.current;

      void fetchFollowedIds(ids).then((followed) => {
        if (!active) {
          return;
        }
        for (const [profileId, override] of overrides.current) {
          if (override.at > startedTick) {
            if (override.following) {
              followed.add(profileId);
            } else {
              followed.delete(profileId);
            }
          } else {
            overrides.current.delete(profileId);
          }
        }
        setFollowedIds(new Set(followed));
      });

      return () => {
        active = false;
      };
    }, [results.profiles])
  );

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

  function changeFollow(profileId: string, following: boolean, _reason: FollowChangeReason) {
    changeTick.current += 1;
    overrides.current.set(profileId, { following, at: changeTick.current });
    setFollowedIds((current) => {
      const next = new Set(current);
      if (following) {
        next.add(profileId);
      } else {
        next.delete(profileId);
      }
      return next;
    });
  }

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
              <ProfileResult
                profile={item.profile}
                following={followedIds.has(item.profile.id)}
                showFollow={item.profile.id !== session?.user.id}
                onPress={() => openProfile(item.profile.id, session?.user.id)}
                onFollowChange={(following, reason) =>
                  changeFollow(item.profile.id, following, reason)
                }
              />
            ) : (
              <Pressable
                onPress={() => router.push(`/post/${item.post.id}` as Href)}
                accessibilityRole="button"
                accessibilityLabel="Abrir publicação"
                style={({ pressed }) => [styles.postRow, pressed && styles.pressed]}
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
                    {publicLabel(item.post.author)} ·{' '}
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

function ProfileResult({
  profile,
  following,
  showFollow,
  onPress,
  onFollowChange,
}: {
  profile: ProfilePreview;
  following: boolean;
  showFollow: boolean;
  onPress: () => void;
  onFollowChange: (following: boolean, reason: FollowChangeReason) => void;
}) {
  const label = publicLabel(profile);
  const handle = profile.displayName?.trim() ? publicHandle(profile.username) : null;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Perfil de ${label}`}
        style={({ pressed }) => [styles.person, pressed && styles.pressed]}
      >
        <Avatar name={label} uri={profile.avatarUrl} size="sm" />
        <View style={styles.rowBody}>
          <Text variant="meta" numberOfLines={1}>
            {label}
          </Text>
          {handle ? (
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {handle}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {showFollow ? (
        <FollowButton
          compact
          profileId={profile.id}
          label={label}
          following={following}
          onChange={onFollowChange}
        />
      ) : null}
    </View>
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
  postRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  person: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingLeft: Spacing.four,
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
