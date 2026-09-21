import {
  normalizeDisplayName,
  normalizeUsername,
  validateDisplayName,
  validateUsername,
} from '@/lib/identity';
import { supabase } from '@/lib/supabase';

const SAVE_PROFILE_ERROR = 'Não foi possível guardar o perfil. Tenta novamente.';
const USERNAME_TAKEN_ERROR = 'Este username já está a ser usado.';

export type OwnProfile = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export async function fetchOwnProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url, bio')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return { profile: null, error: error ? SAVE_PROFILE_ERROR : null };
  }

  return { profile: data, error: null };
}

export async function updateOwnProfile(rawDisplayName: string, rawUsername: string) {
  const displayNameError = validateDisplayName(rawDisplayName);
  const usernameError = validateUsername(rawUsername);

  if (displayNameError || usernameError) {
    return {
      profile: null,
      error: displayNameError ?? usernameError ?? SAVE_PROFILE_ERROR,
    };
  }

  const { data: auth, error: authError } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (authError || !userId) {
    return { profile: null, error: SAVE_PROFILE_ERROR };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      display_name: normalizeDisplayName(rawDisplayName),
      username: normalizeUsername(rawUsername),
    })
    .eq('id', userId)
    .select('username, display_name, avatar_url, bio')
    .single();

  if (error || !data) {
    if (__DEV__ && error) {
      console.warn('updateOwnProfile', error.code);
    }

    if (error?.code === '23505') {
      return { profile: null, error: USERNAME_TAKEN_ERROR };
    }

    if (error?.code === '23514') {
      return {
        profile: null,
        error: 'O username usa 3 a 32 caracteres: letras minúsculas, números e _.',
      };
    }

    return { profile: null, error: SAVE_PROFILE_ERROR };
  }

  return { profile: data, error: null };
}
