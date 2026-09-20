export type ProfilePreview = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
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
