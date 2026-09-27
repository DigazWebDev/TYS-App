export type ProfilePreview = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type PostMediaType = 'image' | 'video';

/** Columns of the future public.post_media table. */
export type PostMediaRecord = {
  id: string;
  post_id: string;
  storage_path: string;
  media_type: PostMediaType;
  position: number;
};

/**
 * What the carousel renders. `url` is resolved separately from `storagePath`,
 * so a private bucket can later supply a signed URL without changing the slide.
 */
export type PostMedia = {
  id: string;
  postId: string;
  storagePath: string;
  mediaType: PostMediaType;
  position: number;
  url: string | null;
};

export type Post = {
  id: string;
  author: ProfilePreview;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  media?: PostMedia[];
  isDemo?: boolean;
};

export type PostComment = {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: ProfilePreview;
};

export type StoryPreview = {
  id: string;
  author: ProfilePreview;
  viewed: boolean;
};

export type FeedSnapshot = {
  posts: Post[];
  stories: StoryPreview[];
  schemaReady: boolean;
};
