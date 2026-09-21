export const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;

/** Client limit only. profiles.display_name has no database length check. */
export const DISPLAY_NAME_MAX_LENGTH = 40;

export function normalizeUsername(raw: string) {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

export function normalizeDisplayName(raw: string) {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function validateUsername(raw: string) {
  if (!USERNAME_PATTERN.test(normalizeUsername(raw))) {
    return 'O username usa 3 a 32 caracteres: letras minúsculas, números e _.';
  }

  return null;
}

export function validateDisplayName(raw: string) {
  if (raw.trim().length > DISPLAY_NAME_MAX_LENGTH) {
    return `O nome não pode ter mais de ${DISPLAY_NAME_MAX_LENGTH} caracteres.`;
  }

  return null;
}

export function publicLabel(profile: {
  displayName?: string | null;
  username?: string | null;
}) {
  const displayName = profile.displayName?.trim();
  if (displayName) {
    return displayName;
  }

  const username = profile.username?.replace(/^@/, '').trim();
  if (username) {
    return `@${username}`;
  }

  return 'Utilizador';
}
