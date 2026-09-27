import type { PostMedia, PostMediaRecord } from '@/types/post';

/**
 * Turns a storage path into a URL the carousel can render.
 * Absolute and local URIs pass through. A bare post-media path stays unresolved
 * until signed URLs exist, and the slide shows the file as unavailable.
 */
export function resolvePostMediaUrl(storagePath: string): string | null {
  const path = storagePath.trim();
  if (!path) {
    return null;
  }

  if (/^(https?:|file:|asset:|data:)/i.test(path)) {
    return path;
  }

  return null;
}

export function postMediaFromRecord(record: PostMediaRecord): PostMedia {
  return {
    id: record.id,
    postId: record.post_id,
    storagePath: record.storage_path,
    mediaType: record.media_type,
    position: record.position,
    url: resolvePostMediaUrl(record.storage_path),
  };
}
