function resolveSiteUrl() {
  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

export const SITE_URL = resolveSiteUrl().replace(/\/+$/, '');
