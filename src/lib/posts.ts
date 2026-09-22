import { supabase } from '@/lib/supabase';

export const POST_BODY_MAX_LENGTH = 500;

export function normalizePostBody(raw: string) {
  return raw.trim();
}

export function validatePostBody(raw: string): string | null {
  const body = normalizePostBody(raw);

  if (body.length === 0) {
    return 'Escreve alguma coisa para publicar.';
  }

  if (body.length > POST_BODY_MAX_LENGTH) {
    return `A publicação não pode ter mais de ${POST_BODY_MAX_LENGTH} caracteres.`;
  }

  return null;
}

function messageForPostError(error: { code?: string; message: string }) {
  const haystack = `${error.code ?? ''} ${error.message}`.toLowerCase();

  if (haystack.includes('23503') || haystack.includes('foreign key')) {
    return 'Não foi possível concluir. O teu perfil ainda não está pronto.';
  }

  if (haystack.includes('23514') || haystack.includes('posts_has_content')) {
    return 'Escreve alguma coisa para publicar.';
  }

  if (
    haystack.includes('42501') ||
    haystack.includes('row-level security') ||
    haystack.includes('unauthorized')
  ) {
    return 'Não tens permissão para alterar esta publicação.';
  }

  return 'Não foi possível concluir. Tenta novamente.';
}

export async function createPost(rawBody: string) {
  const body = normalizePostBody(rawBody);
  const validationError = validatePostBody(body);

  if (validationError) {
    return { postId: null, error: validationError };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (userError || !userId) {
    return {
      postId: null,
      error: 'A tua sessão expirou. Entra novamente para publicar.',
    };
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: userId,
      body,
    })
    .select('id')
    .single();

  if (error) {
    return { postId: null, error: messageForPostError(error) };
  }

  notifyPostCreated();
  return { postId: data.id, error: null };
}

export async function deletePost(postId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (userError || !userId) {
    return { error: 'A tua sessão expirou. Entra novamente.' };
  }

  const { data, error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', userId)
    .select('id');

  if (error) {
    return { error: messageForPostError(error) };
  }

  if (!data?.length) {
    return { error: 'Não foi possível apagar esta publicação.' };
  }

  notifyPostDeleted(postId);
  return { error: null };
}

type PostDeletedListener = (postId: string) => void;
type PostCreatedListener = () => void;

const postDeletedListeners = new Set<PostDeletedListener>();
const postCreatedListeners = new Set<PostCreatedListener>();

export function subscribePostDeleted(listener: PostDeletedListener) {
  postDeletedListeners.add(listener);
  return () => {
    postDeletedListeners.delete(listener);
  };
}

export function subscribePostCreated(listener: PostCreatedListener) {
  postCreatedListeners.add(listener);
  return () => {
    postCreatedListeners.delete(listener);
  };
}

function notifyPostDeleted(postId: string) {
  postDeletedListeners.forEach((listener) => listener(postId));
}

function notifyPostCreated() {
  postCreatedListeners.forEach((listener) => listener());
}
