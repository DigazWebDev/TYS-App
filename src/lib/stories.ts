import {
  STORIES_BUCKET,
  STORIES_FETCH_LIMIT,
  STORY_IMAGE_MAX_BYTES,
  STORY_IMAGE_MIME_TYPES,
  STORY_SIGNED_URL_TTL_SECONDS,
  STORY_VIDEO_MAX_BYTES,
  STORY_VIDEO_MIME_TYPES,
} from '@/constants/stories';
import { supabase } from '@/lib/supabase';
import type { ProfilePreview } from '@/types/post';

export type StoryMedia = {
  id: string;
  mediaUrl: string;
  type: 'image' | 'video';
  createdAt: string;
  viewed: boolean;
};

export type StoryUserGroup = {
  userId: string;
  author: ProfilePreview;
  stories: StoryMedia[];
};

type AuthorCarrier = {
  author: ProfilePreview;
};

export function groupStoriesByAuthor<T extends AuthorCarrier>(
  newestFirst: T[],
  currentUserId?: string
): { userId: string; author: ProfilePreview; stories: T[] }[] {
  const buckets = new Map<string, T[]>();
  const order: string[] = [];

  for (const item of newestFirst) {
    const userId = item.author.id;
    const existing = buckets.get(userId);
    if (!existing) {
      buckets.set(userId, [item]);
      order.push(userId);
    } else {
      existing.push(item);
    }
  }

  const groups = order.map((userId) => {
    const stories = buckets.get(userId) ?? [];
    return {
      userId,
      author: stories[0].author,
      stories: [...stories].reverse(),
    };
  });

  if (!currentUserId) {
    return groups;
  }

  const ownIndex = groups.findIndex((group) => group.userId === currentUserId);
  if (ownIndex <= 0) {
    return groups;
  }

  const [own] = groups.splice(ownIndex, 1);
  return [own, ...groups];
}

export function openingStoryId<T extends { id: string; viewed: boolean }>(stories: T[]) {
  return (stories.find((story) => !story.viewed) ?? stories[0]).id;
}

export function findStoryPosition(groups: StoryUserGroup[], storyId: string) {
  for (let userIndex = 0; userIndex < groups.length; userIndex += 1) {
    const storyIndex = groups[userIndex].stories.findIndex((story) => story.id === storyId);
    if (storyIndex >= 0) {
      return { userIndex, storyIndex };
    }
  }

  return { userIndex: 0, storyIndex: 0 };
}

function authorFromRow(row: {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}): ProfilePreview {
  return {
    id: row.id,
    username: row.username?.replace(/^@/, '') ?? '',
    displayName: row.display_name ?? null,
    avatarUrl: row.avatar_url ?? null,
  };
}

function storyType(value: string): 'image' | 'video' | null {
  if (value === 'image' || value === 'video') {
    return value;
  }
  return null;
}

export async function fetchStoryGroups(currentUserId: string | undefined) {
  const { data, error } = await supabase
    .from('stories')
    .select(
      `
      id,
      user_id,
      media_url,
      type,
      created_at,
      author:profiles!user_id (
        id,
        username,
        display_name,
        avatar_url
      ),
      views:story_views (viewer_id)
    `
    )
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(STORIES_FETCH_LIMIT);

  if (error) {
    if (__DEV__) {
      console.warn('Story fetch failed', error.message);
    }
    throw new Error('Não foi possível carregar as stories.');
  }

  const flat: (StoryMedia & AuthorCarrier)[] = [];

  for (const row of data ?? []) {
    const type = storyType(row.type);
    if (!type || !row.media_url) {
      continue;
    }

    const authorRow = Array.isArray(row.author) ? row.author[0] : row.author;
    const views = Array.isArray(row.views) ? row.views : [];

    flat.push({
      id: row.id,
      mediaUrl: row.media_url,
      type,
      createdAt: row.created_at,
      viewed: currentUserId
        ? views.some((view) => view.viewer_id === currentUserId)
        : false,
      author: authorFromRow(authorRow ?? { id: row.user_id }),
    });
  }

  const groups = groupStoriesByAuthor(flat, currentUserId).map((group) => ({
    userId: group.userId,
    author: group.author,
    stories: group.stories.map((story) => ({
      id: story.id,
      mediaUrl: story.mediaUrl,
      type: story.type,
      createdAt: story.createdAt,
      viewed: story.viewed,
    })),
  }));

  return signStoryMedia(groups);
}

export async function markStoryViewed(storyId: string, viewerId: string) {
  const { error } = await supabase.from('story_views').insert({
    story_id: storyId,
    viewer_id: viewerId,
  });

  if (!error || error.code === '23505') {
    return;
  }
}

type PublishInput = {
  uri: string;
  type: 'image' | 'video';
  mimeType?: string;
};

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

function normalizedMime(mimeType: string | null | undefined) {
  const mime = mimeType?.toLowerCase().split(';')[0]?.trim();
  if (mime === 'image/jpg') {
    return 'image/jpeg';
  }
  return mime ?? '';
}

function mimeFor(type: 'image' | 'video', mimeType?: string) {
  const mime = normalizedMime(mimeType);
  const allowed: readonly string[] = type === 'video' ? STORY_VIDEO_MIME_TYPES : STORY_IMAGE_MIME_TYPES;
  if (mime) {
    return allowed.includes(mime) ? mime : null;
  }
  return type === 'video' ? 'video/mp4' : 'image/jpeg';
}

export function mediaKindFromPicker(
  mimeType: string | null | undefined,
  uri: string
): 'image' | 'video' | null {
  const mime = normalizedMime(mimeType);
  if ((STORY_VIDEO_MIME_TYPES as readonly string[]).includes(mime)) {
    return 'video';
  }
  if ((STORY_IMAGE_MIME_TYPES as readonly string[]).includes(mime)) {
    return 'image';
  }
  if (mime) {
    return null;
  }
  if (/\.(mp4|mov|webm)(\?|$)/i.test(uri)) {
    return 'video';
  }
  if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(uri)) {
    return 'image';
  }
  return null;
}

async function signStoryMedia(groups: StoryUserGroup[]) {
  const paths = [
    ...new Set(
      groups.flatMap((group) =>
        group.stories.map((story) => story.mediaUrl).filter((path) => path.length > 0 && !path.startsWith('http'))
      )
    ),
  ];

  if (paths.length === 0) {
    return groups;
  }

  const signed = await supabase.storage.from(STORIES_BUCKET).createSignedUrls(paths, STORY_SIGNED_URL_TTL_SECONDS);
  if (signed.error) {
    if (__DEV__) {
      console.warn('Story media signing failed', signed.error.message);
    }
    return [];
  }

  const urls = new Map<string, string>();
  for (const item of signed.data ?? []) {
    if (item.path && item.signedUrl && !item.error) {
      urls.set(item.path, item.signedUrl);
    } else if (__DEV__ && item.error) {
      console.warn('Story media signing skipped', item.path, item.error);
    }
  }

  return groups
    .map((group) => ({
      ...group,
      stories: group.stories.flatMap((story) => {
        if (story.mediaUrl.startsWith('http')) {
          return [story];
        }
        const mediaUrl = urls.get(story.mediaUrl);
        return mediaUrl ? [{ ...story, mediaUrl }] : [];
      }),
    }))
    .filter((group) => group.stories.length > 0);
}

export async function publishStory(input: PublishInput) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Inicia sessão para publicar uma story.');
  }

  const mimeType = mimeFor(input.type, input.mimeType);
  const extension = mimeType ? MIME_EXTENSION[mimeType] : null;
  if (!mimeType || !extension) {
    throw new Error('Não foi possível carregar este ficheiro.');
  }

  const response = await fetch(input.uri);
  if (!response.ok) {
    throw new Error('Não foi possível carregar este ficheiro.');
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const limit = input.type === 'video' ? STORY_VIDEO_MAX_BYTES : STORY_IMAGE_MAX_BYTES;
  if (bytes.byteLength === 0 || bytes.byteLength > limit) {
    throw new Error(bytes.byteLength > limit ? 'Este ficheiro é demasiado grande.' : 'Não foi possível carregar este ficheiro.');
  }

  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const uploaded = await supabase.storage.from(STORIES_BUCKET).upload(path, bytes, {
    contentType: mimeType,
    upsert: false,
  });

  if (uploaded.error) {
    if (__DEV__) {
      console.warn('Story upload failed', uploaded.error.message);
    }
    throw new Error('Não foi possível publicar a story. Tenta novamente.');
  }

  const inserted = await supabase.from('stories').insert({
    user_id: user.id,
    media_url: path,
    type: input.type,
  });

  if (inserted.error) {
    const removed = await supabase.storage.from(STORIES_BUCKET).remove([path]);
    if (removed.error && __DEV__) {
      console.warn('Story upload cleanup failed', removed.error.message);
    }
    if (__DEV__) {
      console.warn('Story insert failed', inserted.error.message);
    }
    throw new Error('Não foi possível publicar a story. Tenta novamente.');
  }
}
