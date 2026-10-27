export type StudioUrlResult = { ok: true; url: string } | { ok: false; error: string };

/** Accepts only http and https. Does not create a link for anything else. */
export function validateStudioUrl(input: string): StudioUrlResult {
  const raw = input.trim();
  if (!raw) {
    return { ok: false, error: 'Indica um endereço.' };
  }
  if (/\s/.test(raw)) {
    return { ok: false, error: 'O endereço não pode ter espaços.' };
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: 'Este endereço não é válido. Exemplo: https://exemplo.com' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Só são aceites endereços http e https.' };
  }
  if (!parsed.hostname) {
    return { ok: false, error: 'Falta o domínio do endereço.' };
  }
  return { ok: true, url: parsed.href };
}

export function linkDisplayText(url: string, label: string): string {
  const custom = label.trim();
  if (custom) {
    return custom;
  }
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return url.trim();
  }
}

export function titleFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return base || 'Áudio';
}
