export function friendlyAuthError(
  error: { message?: string } | null | undefined,
  fallback: string
) {
  const message = error?.message?.toLowerCase() ?? '';

  if (
    message.includes('invalid login') ||
    message.includes('invalid credentials')
  ) {
    return 'Email ou palavra-passe incorretos.';
  }

  if (message.includes('email not confirmed')) {
    return 'Confirma o email antes de entrar.';
  }

  if (
    message.includes('already registered') ||
    message.includes('already been registered')
  ) {
    return 'Já existe uma conta com este email.';
  }

  if (message.includes('password') && message.includes('least')) {
    return 'A palavra-passe é demasiado curta.';
  }

  return fallback;
}
