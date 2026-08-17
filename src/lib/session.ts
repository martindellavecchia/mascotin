import { cache } from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';

export async function getSession() {
  return getServerSession(authOptions);
}

export const getCachedSession = cache(getSession);
