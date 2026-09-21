import { supabase } from '@/lib/supabase';

const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OPEN_CONVERSATION_ERROR =
  'Não foi possível abrir a conversa. Tenta novamente.';

export const MESSAGE_BODY_MAX_LENGTH = 4000;

/**
 * Latest page only. Query newest-first, then reverse for display.
 * Older history can continue before the oldest loaded created_at/id.
 */
export const MESSAGE_HISTORY_LIMIT = 200;

const LOAD_CONVERSATION_ERROR = 'Não foi possível carregar a conversa.';
const SEND_MESSAGE_ERROR = 'Não foi possível enviar a mensagem. Tenta novamente.';

export type ChatParticipant = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type DirectMessage = {
  id: string;
  conversationId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export function isUserId(value: string) {
  return USER_ID_PATTERN.test(value);
}

export async function createOrGetDirectConversation(otherUserId: string) {
  const participantId = otherUserId.trim();

  if (!isUserId(participantId)) {
    throw new Error(OPEN_CONVERSATION_ERROR);
  }

  const { data, error } = await supabase.rpc('create_direct_conversation', {
    p_other_user_id: participantId,
  });

  if (error || !data || !isUserId(data)) {
    if (__DEV__ && error) {
      console.warn('create_direct_conversation', error.code);
    }
    throw new Error(OPEN_CONVERSATION_ERROR);
  }

  return data;
}

export function normalizeMessageBody(raw: string) {
  return raw.trim();
}

export function validateMessageBody(raw: string): string | null {
  const body = normalizeMessageBody(raw);

  if (body.length === 0) {
    return 'Escreve uma mensagem.';
  }

  if (body.length > MESSAGE_BODY_MAX_LENGTH) {
    return `A mensagem não pode ter mais de ${MESSAGE_BODY_MAX_LENGTH} caracteres.`;
  }

  return null;
}

function warnDev(scope: string, code?: string) {
  if (__DEV__ && code) {
    console.warn(scope, code);
  }
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return data.user.id;
}

export async function getDirectConversation(conversationId: string) {
  if (!isUserId(conversationId)) {
    return { participant: null, unavailable: true, error: null };
  }

  const userId = await currentUserId();
  if (!userId) {
    return { participant: null, unavailable: false, error: LOAD_CONVERSATION_ERROR };
  }

  const { data, error } = await supabase
    .from('conversations')
    .select('id, is_direct, direct_user_low, direct_user_high')
    .eq('id', conversationId)
    .maybeSingle();

  if (error) {
    warnDev('getDirectConversation', error.code);
    return { participant: null, unavailable: false, error: LOAD_CONVERSATION_ERROR };
  }

  if (!data?.is_direct || !data.direct_user_low || !data.direct_user_high) {
    return { participant: null, unavailable: true, error: null };
  }

  const otherUserId =
    data.direct_user_low === userId
      ? data.direct_user_high
      : data.direct_user_high === userId
        ? data.direct_user_low
        : null;

  if (!otherUserId) {
    return { participant: null, unavailable: true, error: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('id', otherUserId)
    .maybeSingle();

  if (profileError) {
    warnDev('getDirectConversation profile', profileError.code);
  }

  return {
    participant: {
      id: otherUserId,
      username: profile?.username?.replace(/^@/, '') || 'utilizador',
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    } satisfies ChatParticipant,
    unavailable: false,
    error: null,
  };
}

export async function getConversationMessages(conversationId: string) {
  if (!isUserId(conversationId)) {
    return { messages: [], error: null };
  }

  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, author_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(MESSAGE_HISTORY_LIMIT);

  if (error) {
    warnDev('getConversationMessages', error.code);
    return { messages: [], error: LOAD_CONVERSATION_ERROR };
  }

  const messages: DirectMessage[] = (data ?? [])
    .map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      authorId: row.author_id,
      body: row.body,
      createdAt: row.created_at,
    }))
    .reverse();

  return { messages, error: null };
}

export async function sendMessage(conversationId: string, rawBody: string) {
  const body = normalizeMessageBody(rawBody);
  const validationError = validateMessageBody(body);

  if (!isUserId(conversationId) || validationError) {
    return { message: null, error: SEND_MESSAGE_ERROR };
  }

  const userId = await currentUserId();
  if (!userId) {
    return { message: null, error: SEND_MESSAGE_ERROR };
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      author_id: userId,
      body,
    })
    .select('id, conversation_id, author_id, body, created_at')
    .single();

  if (error || !data) {
    warnDev('sendMessage', error?.code);
    return { message: null, error: SEND_MESSAGE_ERROR };
  }

  return {
    message: {
      id: data.id,
      conversationId: data.conversation_id,
      authorId: data.author_id,
      body: data.body,
      createdAt: data.created_at,
    } satisfies DirectMessage,
    error: null,
  };
}
