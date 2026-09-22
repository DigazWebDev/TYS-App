import { supabase } from '@/lib/supabase';
import type { PostComment, ProfilePreview } from '@/types/post';

export const COMMENT_BODY_MAX_LENGTH = 500;

export function normalizeCommentBody(raw: string) {
  return raw.trim();
}

export function validateCommentBody(raw: string): string | null {
  const body = normalizeCommentBody(raw);

  if (body.length === 0) {
    return 'Escreve alguma coisa para comentar.';
  }

  if (body.length > COMMENT_BODY_MAX_LENGTH) {
    return `O comentário não pode ter mais de ${COMMENT_BODY_MAX_LENGTH} caracteres.`;
  }

  return null;
}

const COMMENT_SELECT = `
  id,
  post_id,
  author_id,
  body,
  created_at,
  author:profiles!author_id (
    id,
    username,
    display_name,
    avatar_url
  )
`;

function isMissingRelation(error: { code?: string; message?: string }) {
  const haystack = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  return (
    haystack.includes('42p01') ||
    haystack.includes('pgrst205') ||
    haystack.includes('does not exist') ||
    haystack.includes('could not find the table') ||
    haystack.includes('schema cache')
  );
}

function messageForCommentError(error: { code?: string; message: string }) {
  const haystack = `${error.code ?? ''} ${error.message}`.toLowerCase();

  if (haystack.includes('23503') || haystack.includes('foreign key')) {
    return 'Esta publicação já não está disponível.';
  }

  if (haystack.includes('23514') || haystack.includes('post_comments_body_not_empty')) {
    return 'Escreve alguma coisa para comentar.';
  }

  if (
    haystack.includes('42501') ||
    haystack.includes('row-level security') ||
    haystack.includes('unauthorized')
  ) {
    return 'Não tens permissão para atualizar este comentário.';
  }

  return 'Não foi possível atualizar o comentário. Tenta novamente.';
}

function profileFromRow(row: {
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

function commentFromRow(row: {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author:
    | {
        id: string;
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
      }
    | {
        id: string;
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
      }[]
    | null;
}): PostComment {
  const authorRow = Array.isArray(row.author) ? row.author[0] : row.author;

  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
    author: profileFromRow(
      authorRow ?? { id: row.author_id, username: '' }
    ),
  };
}

async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  const userId = data.user?.id;

  if (error || !userId) {
    return {
      userId: null as string | null,
      error: 'A tua sessão expirou. Entra novamente.',
    };
  }

  return { userId, error: null };
}

type CommentCountListener = (postId: string, delta: number) => void;

const commentCountListeners = new Set<CommentCountListener>();

export function subscribeCommentCount(listener: CommentCountListener) {
  commentCountListeners.add(listener);
  return () => {
    commentCountListeners.delete(listener);
  };
}

function notifyCommentCount(postId: string, delta: number) {
  commentCountListeners.forEach((listener) => listener(postId, delta));
}

export async function fetchCommentCountsForPosts(
  postIds: string[]
): Promise<Record<string, number>> {
  if (postIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('post_comments')
    .select('post_id')
    .in('post_id', postIds);

  if (error) {
    if (isMissingRelation(error)) {
      return {};
    }

    throw new Error(error.message);
  }

  const counts: Record<string, number> = {};

  for (const row of data ?? []) {
    counts[row.post_id] = (counts[row.post_id] ?? 0) + 1;
  }

  return counts;
}

export async function getComments(postId: string) {
  const { data, error } = await supabase
    .from('post_comments')
    .select(COMMENT_SELECT)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingRelation(error)) {
      return { comments: [] as PostComment[], error: null };
    }

    return {
      comments: [] as PostComment[],
      error: messageForCommentError(error),
    };
  }

  return {
    comments: (data ?? []).map(commentFromRow),
    error: null,
  };
}

export async function createComment(postId: string, content: string) {
  const body = normalizeCommentBody(content);
  const validationError = validateCommentBody(body);

  if (validationError) {
    return { comment: null, error: validationError };
  }

  const { userId, error: authError } = await requireUserId();

  if (authError || !userId) {
    return {
      comment: null,
      error: authError ?? 'A tua sessão expirou. Entra novamente.',
    };
  }

  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      post_id: postId,
      author_id: userId,
      body,
    })
    .select(COMMENT_SELECT)
    .single();

  if (error) {
    return { comment: null, error: messageForCommentError(error) };
  }

  notifyCommentCount(postId, 1);
  return { comment: commentFromRow(data), error: null };
}

export async function deleteComment(commentId: string) {
  const { userId, error: authError } = await requireUserId();

  if (authError || !userId) {
    return {
      error: authError ?? 'A tua sessão expirou. Entra novamente.',
    };
  }

  const { data, error } = await supabase
    .from('post_comments')
    .delete()
    .eq('id', commentId)
    .eq('author_id', userId)
    .select('id, post_id');

  if (error) {
    return { error: messageForCommentError(error) };
  }

  if (!data?.length) {
    return { error: 'Não foi possível apagar este comentário.' };
  }

  notifyCommentCount(data[0].post_id, -1);
  return { error: null };
}
