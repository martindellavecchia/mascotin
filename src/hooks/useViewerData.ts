'use client';

import { useCallback, useContext } from 'react';
import { QueryClientContext, useQuery } from '@tanstack/react-query';
import type { Owner, Pet } from '@/types';

export const viewerQueryKeys = {
  owner: (userId?: string) => ['viewer', userId, 'owner'] as const,
  pets: (userId?: string) => ['viewer', userId, 'pets'] as const,
  matchCount: (userId?: string) => ['viewer', userId, 'match-count'] as const,
  posts: (userId?: string, filter = '') => ['viewer', userId, 'posts', filter] as const,
};

export function useOwnerProfile(userId?: string) {
  return useQuery({
    queryKey: viewerQueryKeys.owner(userId),
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/owner/profile', { signal });
      if (!response.ok) throw new Error('No pudimos cargar tu perfil');
      const data = await response.json() as { owner?: Owner; role?: string };
      return { owner: data.owner ?? null, role: data.role };
    },
  });
}

export function useMyPets(userId?: string) {
  return useQuery({
    queryKey: viewerQueryKeys.pets(userId),
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/pet/mine', { signal });
      const data = await response.json() as { success?: boolean; pets?: Pet[] };
      if (!response.ok || !data.success || !Array.isArray(data.pets)) {
        throw new Error('No pudimos cargar tus mascotas');
      }
      return data.pets;
    },
  });
}

export function useMatchCount(userId?: string) {
  return useQuery({
    queryKey: viewerQueryKeys.matchCount(userId),
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/matches/count', { signal });
      const data = await response.json() as { count?: number };
      if (!response.ok || typeof data.count !== 'number') {
        throw new Error('No pudimos cargar tus encuentros');
      }
      return data.count;
    },
  });
}

export function useInvalidateViewerData() {
  const queryClient = useContext(QueryClientContext);
  return useCallback(() => {
    void queryClient?.invalidateQueries({ queryKey: ['viewer'] });
  }, [queryClient]);
}
