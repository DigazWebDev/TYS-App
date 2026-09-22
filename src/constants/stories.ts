/** How long a photo story stays on screen before it advances. */
export const STORY_PHOTO_DURATION_MS = 5000;

/** Matches the feed rail query so the viewer order stays the same. */
export const STORIES_FETCH_LIMIT = 30;

/** Private Supabase Storage bucket for story media. */
export const STORIES_BUCKET = 'stories';

/** Signed playback URLs stay valid across a normal viewing session. */
export const STORY_SIGNED_URL_TTL_SECONDS = 2 * 60 * 60;

/** Camera and gallery photos. The bucket allows up to the video limit. */
export const STORY_IMAGE_MAX_BYTES = 15 * 1024 * 1024;

/** Matches the bucket file size limit. */
export const STORY_VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export const STORY_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export const STORY_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;

export const RECENT_STORY_PHOTO_COUNT = 16;
