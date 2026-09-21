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
const LOAD_INBOX_ERROR = 'Não foi possível carregar as conversas.';
const SEND_MESSAGE_ERROR = 'Não foi possível enviar a mensagem. Tenta novamente.';

/**
 * First inbox page, newest activity first.
 * A later page can continue before the oldest loaded updated_at/id.
 * The embedded messages resource is limited to the latest row per conversation.
 */
export const INBOX_CONVERSATION_LIMIT = 50;

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

export type InboxLastMessage = {
  id: string;
  body: string;
  createdAt: string;
};

export type InboxConversation = {
  conversationId: string;
  otherUser: ChatParticipant;
  lastMessage: InboxLastMessage | null;
  updatedAt: string;
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
      username: profile?.username?.replace(/^@/, '') || '',
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

const INBOX_SELECT = `
  id,
  updated_at,
  is_direct,
  direct_user_low,
  direct_user_high,
  low_profile:profiles!conversations_direct_user_low_fkey (
    id,
    username,
    display_name,
    avatar_url
  ),
  high_profile:profiles!conversations_direct_user_high_fkey (
    id,
    username,
    display_name,
    avatar_url
  ),
  messages (
    id,
    body,
    created_at
  )
`;

type ProfileEmbed = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function firstRecord(value: unknown) {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object') {
    return null;
  }
  return row as Record<string, unknown>;
}

function readProfile(value: unknown): ProfileEmbed | null {
  const record = firstRecord(value);
  if (!record || typeof record.id !== 'string') {
    return null;
  }

  return {
    id: record.id,
    username: typeof record.username === 'string' ? record.username : null,
    display_name:
      typeof record.display_name === 'string' ? record.display_name : null,
    avatar_url: typeof record.avatar_url === 'string' ? record.avatar_url : null,
  };
}

function readLastMessage(value: unknown): InboxLastMessage | null {
  const rows = Array.isArray(value) ? value : value ? [value] : [];
  let latest: InboxLastMessage | null = null;

  for (const entry of rows) {
    const record = firstRecord(entry);
    if (
      !record ||
      typeof record.id !== 'string' ||
      typeof record.body !== 'string' ||
      typeof record.created_at !== 'string'
    ) {
      continue;
    }

    const candidate = {
      id: record.id,
      body: record.body,
      createdAt: record.created_at,
    };

    if (
      !latest ||
      candidate.createdAt > latest.createdAt ||
      (candidate.createdAt === latest.createdAt && candidate.id > latest.id)
    ) {
      latest = candidate;
    }
  }

  return latest;
}

function participantFromProfile(
  userId: string,
  profile: ProfileEmbed | null
): ChatParticipant {
  return {
    id: userId,
    username: profile?.username?.replace(/^@/, '') || '',
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  };
}

export async function getInboxConversations() {
  const userId = await currentUserId();
  if (!userId) {
    return { conversations: [] as InboxConversation[], error: LOAD_INBOX_ERROR };
  }

  const { data, error } = await supabase
    .from('conversations')
    .select(INBOX_SELECT)
    .eq('is_direct', true)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .order('created_at', { referencedTable: 'messages', ascending: false })
    .order('id', { referencedTable: 'messages', ascending: false })
    .limit(INBOX_CONVERSATION_LIMIT)
    .limit(1, { referencedTable: 'messages' });

  if (error) {
    warnDev('getInboxConversations', error.code);
    return { conversations: [] as InboxConversation[], error: LOAD_INBOX_ERROR };
  }

  const conversations: InboxConversation[] = [];

  for (const entry of data ?? []) {
    const row = firstRecord(entry);
    if (
      !row ||
      row.is_direct !== true ||
      typeof row.id !== 'string' ||
      typeof row.updated_at !== 'string' ||
      typeof row.direct_user_low !== 'string' ||
      typeof row.direct_user_high !== 'string'
    ) {
      continue;
    }

    const otherUserId =
      row.direct_user_low === userId
        ? row.direct_user_high
        : row.direct_user_high === userId
          ? row.direct_user_low
          : null;

    if (!otherUserId) {
      continue;
    }

    const profile = readProfile(
      otherUserId === row.direct_user_low ? row.low_profile : row.high_profile
    );

    conversations.push({
      conversationId: row.id,
      otherUser: participantFromProfile(otherUserId, profile),
      lastMessage: readLastMessage(row.messages),
      updatedAt: row.updated_at,
    });
  }

  return { conversations, error: null };
}
