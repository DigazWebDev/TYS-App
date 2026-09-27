/** Local draft limits. They match the future post-media rules and are not uploaded. */
export const POST_MEDIA_MAX_ITEMS = 10;

export const POST_MEDIA_MAX_VIDEOS = 4;

/** Same client cap already used for story images. */
export const POST_IMAGE_MAX_BYTES = 15 * 1024 * 1024;

/** Same client cap already used for story videos. */
export const POST_VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export const POST_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const POST_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;
