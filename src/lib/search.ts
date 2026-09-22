import { supabase } from '@/lib/supabase';
import { profileFromRow } from '@/lib/feed';
import type { Post, ProfilePreview } from '@/types/post';

const SEARCH_LIMIT = 20;

export type SearchResults = {
  profiles: ProfilePreview[];
  posts: Post[];
};

/** Username lookup term. Strips a leading @ and does not change the stored username. */
export function profileSearchTerm(raw: string) {
  return raw.trim().replace(/^@+/, '');
}

function escapeIlike(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/"/g, '')
    .replace(/[,()]/g, ' ');
}

export async function searchProfiles(rawQuery: string, excludeUserId?: string) {
  const term = profileSearchTerm(rawQuery);

  if (term.length < 2) {
    return [];
  }

  const usernamePattern = `%${escapeIlike(term.toLowerCase())}%`;
  const namePattern = `%${escapeIlike(term)}%`;
  let request = supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .or(`username.ilike."${usernamePattern}",display_name.ilike."${namePattern}"`)
    .limit(SEARCH_LIMIT);

  if (excludeUserId) {
    request = request.neq('id', excludeUserId);
  }

  const { data, error } = await request;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map(profileFromRow)
    .filter((profile) => profile.id !== excludeUserId);
}

export async function searchPublicContent(rawQuery: string): Promise<SearchResults> {
  const term = profileSearchTerm(rawQuery);

  if (term.length < 2) {
    return { profiles: [], posts: [] };
  }

  const pattern = `%${escapeIlike(term)}%`;

  const [profiles, postsResult] = await Promise.all([
    searchProfiles(rawQuery),
    supabase
      .from('posts')
      .select(
        `
        id,
        body,
        image_url,
        created_at,
        author:profiles!author_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `
      )
      .ilike('body', pattern)
      .order('created_at', { ascending: false })
      .limit(SEARCH_LIMIT),
  ]);

  if (postsResult.error) {
    throw new Error(postsResult.error.message);
  }
  const posts: Post[] = (postsResult.data ?? []).map((row) => {
    const authorRow = Array.isArray(row.author) ? row.author[0] : row.author;

    return {
      id: row.id,
      author: profileFromRow(
        authorRow ?? { id: 'unknown', username: '' }
      ),
      body: row.body ?? '',
      imageUrl: row.image_url ?? null,
      createdAt: row.created_at,
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
    };
  });

  return { profiles, posts };
}
