import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { FollowButton } from '@/components/social/FollowButton';
import { Avatar, Button, Divider, EmptyState, Header, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useThemeTokens } from '@/hooks/use-theme';
import {
  fetchFollowPage,
  FOLLOWS_PAGE_SIZE,
  type FollowChangeReason,
  type FollowPerson,
} from '@/lib/follows';
import { publicHandle, publicLabel } from '@/lib/identity';
import { openProfile } from '@/lib/navigation';

type FollowListProps = {
  profileId: string | undefined;
  direction: 'followers' | 'following';
};

export function FollowList({ profileId, direction }: FollowListProps) {
  const tokens = useThemeTokens();
  const { session } = useAuthSession();
  const currentUserId = session?.user.id;
  const [people, setPeople] = useState<FollowPerson[]>([]);
  const [followedIds, setFollowedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);
  const hasPeople = useRef(false);
  const changeTick = useRef(0);
  const overrides = useRef(new Map<string, { following: boolean; at: number }>());
  const title = direction === 'followers' ? 'Seguidores' : 'A seguir';
  const emptyDescription =
    direction === 'followers' ? 'Ainda não há seguidores.' : 'Ainda não segue ninguém.';

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!profileId) {
        setStatus('error');
        return;
      }

      const id = ++requestId.current;
      const startedTick = changeTick.current;
      if (mode === 'refresh') {
        setRefreshing(true);
      } else if (!hasPeople.current) {
        setStatus('loading');
      }

      try {
        const page = await fetchFollowPage({ profileId, direction });
        if (id !== requestId.current) {
          return;
        }
        const followed = new Set(page.followedIds);
        for (const [personId, override] of overrides.current) {
          if (override.at > startedTick) {
            if (override.following) {
              followed.add(personId);
            } else {
              followed.delete(personId);
            }
          } else {
            overrides.current.delete(personId);
          }
        }
        setPeople(page.people);
        hasPeople.current = page.people.length > 0;
        setFollowedIds(followed);
        setHasMore(page.hasMore);
        setStatus('ready');
      } catch {
        if (id !== requestId.current) {
          return;
        }
        setStatus('error');
      } finally {
        if (id === requestId.current) {
          setRefreshing(false);
        }
      }
    },
    [direction, profileId]
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function changeFollow(personId: string, following: boolean, _reason: FollowChangeReason) {
    changeTick.current += 1;
    overrides.current.set(personId, { following, at: changeTick.current });
    setFollowedIds((current) => {
      const next = new Set(current);
      if (following) {
        next.add(personId);
      } else {
        next.delete(personId);
      }
      return next;
    });
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header title={title} onBack={() => router.back()} showBorder={false} />
      <FlatList
        data={status === 'ready' ? people : []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load('refresh')}
            tintColor={tokens.accent.teal.default}
            colors={[tokens.accent.teal.default]}
          />
        }
        ItemSeparatorComponent={() => <Divider inset />}
        ListEmptyComponent={
          status === 'loading' ? (
            <FollowSkeleton />
          ) : status === 'error' ? (
            <EmptyState
              title="Não foi possível carregar"
              description="Tenta novamente."
              action={
                <Button variant="secondary" onPress={() => void load()}>
                  Tentar novamente
                </Button>
              }
            />
          ) : (
            <EmptyState title={title} description={emptyDescription} />
          )
        }
        ListFooterComponent={
          status === 'ready' && hasMore ? (
            <Text variant="caption" tone="secondary" style={styles.more}>
              {`A mostrar as ${FOLLOWS_PAGE_SIZE} relações mais recentes.`}
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const label = publicLabel(item);
          const handle = item.displayName?.trim() ? publicHandle(item.username) : null;
          const isMe = item.id === currentUserId;

          return (
            <View style={styles.row}>
              <Pressable
                onPress={() => openProfile(item.id, currentUserId)}
                accessibilityRole="button"
                accessibilityLabel={`Perfil de ${label}`}
                style={({ pressed }) => [styles.person, pressed && styles.pressed]}
              >
                <Avatar name={label} uri={item.avatarUrl} size="sm" />
                <View style={styles.copy}>
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
              {isMe ? null : (
                <FollowButton
                  compact
                  profileId={item.id}
                  label={label}
                  following={followedIds.has(item.id)}
                  onChange={(following, reason) => changeFollow(item.id, following, reason)}
                />
              )}
            </View>
          );
        }}
        contentContainerStyle={people.length === 0 ? styles.empty : styles.list}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

function FollowSkeleton() {
  const tokens = useThemeTokens();

  return (
    <View style={styles.skeleton}>
      <ActivityIndicator color={tokens.accent.teal.default} />
      {Array.from({ length: 5 }, (_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={[styles.skeletonAvatar, { backgroundColor: tokens.background.elevated }]} />
          <View style={styles.skeletonCopy}>
            <View style={[styles.skeletonLine, { backgroundColor: tokens.background.elevated }]} />
            <View
              style={[
                styles.skeletonLine,
                styles.skeletonShort,
                { backgroundColor: tokens.background.elevated },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: Spacing.five,
  },
  empty: {
    flexGrow: 1,
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
  copy: {
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
  more: {
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  skeleton: {
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  skeletonCopy: {
    flex: 1,
    gap: Spacing.two,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
  skeletonShort: {
    width: '42%',
  },
});
