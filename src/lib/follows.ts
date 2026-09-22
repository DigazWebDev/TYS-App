import { supabase } from '@/lib/supabase';
import type { ProfilePreview } from '@/types/post';

/** First page size. `before` is reserved for a later cursor. */
export const FOLLOWS_PAGE_SIZE = 50;

const FOLLOW_ERROR = 'Não foi possível seguir este utilizador. Tenta novamente.';
const UNFOLLOW_ERROR = 'Não foi possível deixar de seguir este utilizador. Tenta novamente.';

export type FollowChangeReason = 'optimistic' | 'confirmed' | 'rollback' | 'already';

export type FollowPerson = ProfilePreview & {
  followedAt: string;
};

export type FollowPage = {
  people: FollowPerson[];
  hasMore: boolean;
  followedIds: string[];
};

type ProfileJoin = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

/**
 * Relationship lists use follows.created_at descending:
 * the newest follow appears first.
 */
export async function fetchFollowCounts(profileId: string) {
  const [followers, following] = await Promise.all([
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profileId),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profileId),
  ]);

  if (followers.error || following.error) {
    if (__DEV__) {
      console.warn('Follow counts failed', followers.error?.message ?? following.error?.message);
    }
    return { followers: 0, following: 0, error: 'Não foi possível carregar os seguidores.' };
  }

  return {
    followers: followers.count ?? 0,
    following: following.count ?? 0,
    error: null,
  };
}

export async function fetchIsFollowing(profileId: string) {
  const user = await currentUser();
  if (!user || user.id === profileId) {
    return false;
  }

  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)
    .eq('following_id', profileId)
    .maybeSingle();

  if (error) {
    if (__DEV__) {
      console.warn('Follow state failed', error.message);
    }
    return false;
  }

  return Boolean(data);
}

/** One query for a page of profile ids. Not one query per row. */
export async function fetchFollowedIds(profileIds: readonly string[]) {
  const uniqueIds = [...new Set(profileIds.filter(Boolean))];
  const user = await currentUser();
  if (!user || uniqueIds.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)
    .in('following_id', uniqueIds);

  if (error) {
    if (__DEV__) {
      console.warn('Follow batch failed', error.message);
    }
    return new Set<string>();
  }

  return new Set((data ?? []).map((row) => row.following_id));
}

export async function fetchFollowPage(input: {
  profileId: string;
  direction: 'followers' | 'following';
  limit?: number;
  before?: string;
}) {
  const limit = input.limit ?? FOLLOWS_PAGE_SIZE;
  const rows =
    input.direction === 'followers'
      ? await fetchFollowerRows(input.profileId, limit, input.before)
      : await fetchFollowingRows(input.profileId, limit, input.before);
  const followedIds = await fetchFollowedIds(rows.map((person) => person.id));

  return {
    people: rows,
    hasMore: rows.length === limit,
    followedIds: [...followedIds],
  } satisfies FollowPage;
}

async function fetchFollowerRows(profileId: string, limit: number, before?: string) {
  let query = supabase
    .from('follows')
    .select(
      `
      created_at,
      follower:profiles!follows_follower_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .eq('following_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;
  if (error) {
    if (__DEV__) {
      console.warn('Follow list failed', error.message);
    }
    throw new Error('Não foi possível carregar os seguidores.');
  }

  return (data ?? []).flatMap((row) => personFromJoin(row.follower, row.created_at));
}

async function fetchFollowingRows(profileId: string, limit: number, before?: string) {
  let query = supabase
    .from('follows')
    .select(
      `
      created_at,
      followed:profiles!follows_following_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .eq('follower_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;
  if (error) {
    if (__DEV__) {
      console.warn('Follow list failed', error.message);
    }
    throw new Error('Não foi possível carregar as contas seguidas.');
  }

  return (data ?? []).flatMap((row) => personFromJoin(row.followed, row.created_at));
}

function personFromJoin(joined: ProfileJoin | ProfileJoin[] | null, followedAt: string) {
  const profile = Array.isArray(joined) ? joined[0] : joined;
  if (!profile?.id) {
    return [];
  }

  return [
    {
      id: profile.id,
      username: profile.username?.replace(/^@/, '') ?? '',
      displayName: profile.display_name ?? null,
      avatarUrl: profile.avatar_url ?? null,
      followedAt,
    },
  ];
}

export async function followUser(profileId: string) {
  const user = await currentUser();
  if (!user) {
    return { error: 'Inicia sessão para seguir.', alreadyFollowing: false };
  }
  if (user.id === profileId) {
    return { error: 'Não podes seguir a tua conta.', alreadyFollowing: false };
  }

  const { error } = await supabase.from('follows').insert({
    follower_id: user.id,
    following_id: profileId,
  });

  if (!error) {
    return { error: null, alreadyFollowing: false };
  }

  if (error.code === '23505') {
    return { error: null, alreadyFollowing: true };
  }

  if (__DEV__) {
    console.warn('Follow failed', error.message);
  }

  return { error: FOLLOW_ERROR, alreadyFollowing: false };
}

export async function unfollowUser(profileId: string) {
  const user = await currentUser();
  if (!user) {
    return { error: 'Inicia sessão para deixar de seguir.' };
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', profileId);

  if (error) {
    if (__DEV__) {
      console.warn('Unfollow failed', error.message);
    }
    return { error: UNFOLLOW_ERROR };
  }

  return { error: null };
}

async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return data.user;
}
