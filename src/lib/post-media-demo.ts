import { postMediaFromRecord } from '@/lib/post-media-url';
import type { Post, PostMediaRecord } from '@/types/post';

/** Local feed samples. Turn this off to hide them. They are never written to Supabase. */
export const SHOW_POST_MEDIA_DEMO = true;

const DEMO_AUTHOR = {
  id: 'demo-author',
  username: 'demonstracao',
  displayName: 'Demonstração',
  avatarUrl: null,
};

function demoPost(
  id: string,
  body: string,
  records: PostMediaRecord[],
): Post {
  return {
    id,
    author: DEMO_AUTHOR,
    body,
    imageUrl: null,
    createdAt: '2026-09-27T12:00:00.000Z',
    likeCount: 0,
    commentCount: 0,
    likedByMe: false,
    isDemo: true,
    media: records.map(postMediaFromRecord),
  };
}

export function demoFeedPosts(): Post[] {
  return [
    demoPost('demo-three-photos', 'Demonstração local: três fotografias.', [
      photo('demo-three-photos', 0, 'https://picsum.photos/id/1015/800/1000'),
      photo('demo-three-photos', 1, 'https://picsum.photos/id/1016/800/1000'),
      photo('demo-three-photos', 2, 'https://picsum.photos/id/1025/800/1000'),
    ]),
    demoPost('demo-photo-video', 'Demonstração local: uma fotografia e um vídeo.', [
      photo('demo-photo-video', 0, 'https://picsum.photos/id/1035/800/1000'),
      video(
        'demo-photo-video',
        1,
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      ),
    ]),
    demoPost('demo-mixed', 'Demonstração local: várias fotografias e vídeos.', [
      photo('demo-mixed', 0, 'https://picsum.photos/id/1043/800/1000'),
      video(
        'demo-mixed',
        1,
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      ),
      photo('demo-mixed', 2, 'https://picsum.photos/id/106/800/1000'),
      video(
        'demo-mixed',
        3,
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      ),
      photo('demo-mixed', 4, 'https://picsum.photos/id/110/800/1000'),
    ]),
    demoPost('demo-unavailable', 'Demonstração local: um ficheiro indisponível.', [
      photo('demo-unavailable', 0, 'https://picsum.photos/id/111/800/1000'),
      {
        id: 'demo-unavailable-missing',
        post_id: 'demo-unavailable',
        storage_path: 'demo/missing.jpg',
        media_type: 'image',
        position: 1,
      },
    ]),
  ];
}

function photo(postId: string, position: number, url: string): PostMediaRecord {
  return {
    id: `${postId}-${position}`,
    post_id: postId,
    storage_path: url,
    media_type: 'image',
    position,
  };
}

function video(postId: string, position: number, url: string): PostMediaRecord {
  return {
    id: `${postId}-${position}`,
    post_id: postId,
    storage_path: url,
    media_type: 'video',
    position,
  };
}
