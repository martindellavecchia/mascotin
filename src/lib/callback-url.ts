export const DEFAULT_CALLBACK_URL = '/inicio';

export function sanitizeCallbackUrl(value: string | null | undefined): string {
  if (!value) return DEFAULT_CALLBACK_URL;

  let candidate = value.trim();
  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    return DEFAULT_CALLBACK_URL;
  }

  if (!candidate.startsWith('/')) return DEFAULT_CALLBACK_URL;
  if (candidate.startsWith('//')) return DEFAULT_CALLBACK_URL;
  if (candidate.includes('://') || candidate.includes('\\')) return DEFAULT_CALLBACK_URL;

  return candidate;
}
