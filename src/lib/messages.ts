import { supabase } from '@/lib/supabase';

const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OPEN_CONVERSATION_ERROR =
  'Não foi possível abrir a conversa. Tenta novamente.';

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
