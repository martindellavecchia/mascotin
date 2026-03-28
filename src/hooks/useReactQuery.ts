import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Pet } from '@/types';

export function useMyPets() {
  return useQuery({
    queryKey: ['myPets'],
    queryFn: async () => {
      const res = await fetch('/api/pet/mine');
      if (!res.ok) throw new Error('Failed to fetch pets');
      const data = await res.json();
      return data.pets as Pet[];
    },
  });
}

export function usePetsForSwipe(currentPetId?: string) {
  return useQuery({
    queryKey: ['petsForSwipe', currentPetId],
    queryFn: async () => {
      if (!currentPetId) return [];
      const res = await fetch(`/api/pets?currentPetId=${currentPetId}`);
      if (!res.ok) throw new Error('Failed to fetch pets');
      const data = await res.json();
      return data.pets as Pet[];
    },
    enabled: !!currentPetId,
  });
}

export function useMatches() {
  return useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      const res = await fetch('/api/matches');
      if (!res.ok) throw new Error('Failed to fetch matches');
      const data = await res.json();
      return data.matches as Pet[];
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error('Failed to create post');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function usePosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const res = await fetch('/api/posts?limit=10');
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      return data.posts;
    },
  });
}
