import { supabase } from '@/lib/supabase';

export type PostLikesMap = {
  likeCountByPostId: Record<string, number>;
  likedPostIds: Set<string>;
};

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

function isUniqueViolation(error: { code?: string; message: string }) {
  const haystack = `${error.code ?? ''} ${error.message}`.toLowerCase();
  return (
    haystack.includes('23505') ||
    haystack.includes('duplicate') ||
    haystack.includes('unique')
  );
}

function messageForLikeError(error: { code?: string; message: string }) {
  const haystack = `${error.code ?? ''} ${error.message}`.toLowerCase();

  if (haystack.includes('23503') || haystack.includes('foreign key')) {
    return 'Esta publicação já não está disponível.';
  }

  if (
    haystack.includes('42501') ||
    haystack.includes('row-level security') ||
    haystack.includes('unauthorized')
  ) {
    return 'Não tens permissão para atualizar este gosto.';
  }

  return 'Não foi possível atualizar o gosto. Tenta novamente.';
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

export async function fetchLikesForPosts(
  postIds: string[]
): Promise<PostLikesMap> {
  if (postIds.length === 0) {
    return { likeCountByPostId: {}, likedPostIds: new Set() };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user.id;

  const { data, error } = await supabase
    .from('post_likes')
    .select('post_id, user_id')
    .in('post_id', postIds);

  if (error) {
    if (isMissingRelation(error)) {
      return { likeCountByPostId: {}, likedPostIds: new Set() };
    }

    throw new Error(error.message);
  }

  const likeCountByPostId: Record<string, number> = {};
  const likedPostIds = new Set<string>();

  for (const row of data ?? []) {
    likeCountByPostId[row.post_id] = (likeCountByPostId[row.post_id] ?? 0) + 1;

    if (userId && row.user_id === userId) {
      likedPostIds.add(row.post_id);
    }
  }

  return { likeCountByPostId, likedPostIds };
}

export async function likePost(postId: string) {
  const { userId, error: authError } = await requireUserId();

  if (authError || !userId) {
    return { error: authError ?? 'A tua sessão expirou. Entra novamente.' };
  }

  const { error } = await supabase.from('post_likes').insert({
    post_id: postId,
    user_id: userId,
  });

  if (error && !isUniqueViolation(error)) {
    return { error: messageForLikeError(error) };
  }

  return { error: null };
}

export async function unlikePost(postId: string) {
  const { userId, error: authError } = await requireUserId();

  if (authError || !userId) {
    return { error: authError ?? 'A tua sessão expirou. Entra novamente.' };
  }

  const { error } = await supabase
    .from('post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);

  if (error) {
    return { error: messageForLikeError(error) };
  }

  return { error: null };
}
