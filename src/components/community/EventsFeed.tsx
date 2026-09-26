'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { ChevronDown, Loader2, MapPin, MessagesSquare } from 'lucide-react';
import CreatePostCard from '@/components/community/CreatePostCard';
import EditPostModal from '@/components/community/EditPostModal';
import PostCard from '@/components/feed/PostCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StateFeedback } from '@/components/ui/state-feedback';
import { useMyPets, useOwnerProfile, viewerQueryKeys } from '@/hooks/useViewerData';

interface Post {
    id: string;
    content: string;
    images: string;
    postType?: string;
    eventDate?: string;
    eventLocation?: string;
    location?: string;
    createdAt: string;
    authorId: string;
    updatedAt: string;
    author: {
        id: string;
        name: string;
        image: string | null;
    };
    pet?: {
        id: string;
        name: string;
        images: string;
        breed: string | null;
        petType: string;
    };
    _count: {
        likes: number;
        comments: number;
    };
    isLiked?: boolean;
}

interface EventsFeedProps {
    refreshKey?: number;
}

interface PostsPage {
    posts: Post[];
    nextCursor: string | null;
}

const PAGE_SIZE = 20;

export default function EventsFeed({ refreshKey = 0 }: EventsFeedProps) {
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const queryClient = useQueryClient();
    const petsQuery = useMyPets(userId);
    const ownerQuery = useOwnerProfile(userId);
    const pets = petsQuery.data ?? [];
    const ownerImage = ownerQuery.data?.owner?.image || undefined;
    const ownerLocation = ownerQuery.data?.owner?.location || null;
    const ownerLoaded = ownerQuery.isSuccess;
    const previousRefreshKey = useRef(refreshKey);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [activeFilter, setActiveFilter] = useState<string | null>(null);

    useEffect(() => {
        setActiveFilter(new URLSearchParams(window.location.search).get('filter') || '');
    }, []);

    useEffect(() => {
        if (previousRefreshKey.current === refreshKey) return;
        previousRefreshKey.current = refreshKey;
        void queryClient.invalidateQueries({ queryKey: ['viewer', userId, 'posts'] });
    }, [refreshKey, queryClient, userId]);

    const postsQuery = useInfiniteQuery({
        queryKey: viewerQueryKeys.posts(userId, activeFilter || ''),
        enabled: Boolean(userId) && activeFilter !== null,
        staleTime: 30_000,
        retry: false,
        initialPageParam: null as string | null,
        queryFn: async ({ signal, pageParam }): Promise<PostsPage> => {
            const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
            if (activeFilter) params.set('postType', activeFilter);
            if (pageParam) params.set('cursor', pageParam);
            const response = await fetch(`/api/posts?${params}`, { signal });
            const data = await response.json() as { posts?: Post[]; nextCursor?: string | null; hasMore?: boolean };
            if (!response.ok || !Array.isArray(data.posts)) throw new Error('No se pudieron cargar las publicaciones');
            return { posts: data.posts, nextCursor: data.hasMore === false ? null : data.nextCursor ?? null };
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });
    const posts = useMemo(() => {
        const seen = new Set<string>();
        return (postsQuery.data?.pages ?? []).flatMap((page) => page.posts).filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });
    }, [postsQuery.data]);
    const loading = postsQuery.isPending;
    const loadError = postsQuery.isError && !postsQuery.data;
    const fetchPosts = () => {
        void queryClient.invalidateQueries({ queryKey: ['viewer', userId, 'posts'] });
    };

    return (
        <div className="space-y-4">
            <div className="min-h-11">
            {ownerLoaded ? <Link
                href="/profile?edit=true"
                className="inline-flex min-h-11 max-w-full items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 [overflow-wrap:anywhere]">{ownerLocation ? `Tu zona: ${ownerLocation}` : 'Agregá tu zona al perfil'}</span>
            </Link> : <p className="flex min-h-11 items-center text-sm text-muted-foreground">Publicaciones de la comunidad</p>}
            </div>
            <div role="group" aria-label="Filtrar publicaciones" className="flex gap-2 overflow-x-auto pb-1">
                {[
                    { value: '', label: 'Todas' },
                    { value: 'question', label: 'Preguntas' },
                    { value: 'recommendation', label: 'Recomendaciones' },
                    { value: 'event', label: 'Eventos' },
                ].map((filter) => (
                    <button
                        key={filter.value || 'all'}
                        type="button"
                        onClick={() => {
                            const url = filter.value ? `/community?filter=${filter.value}` : '/community';
                            window.history.replaceState(null, '', url);
                            setActiveFilter(filter.value);
                        }}
                        aria-pressed={activeFilter === filter.value}
                        className={`min-h-11 shrink-0 rounded-full border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus ${
                            activeFilter === filter.value
                                ? 'border-primary bg-primary-soft text-primary'
                                : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                        }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>
            <CreatePostCard
                userImage={ownerImage || session?.user?.image || undefined}
                userName={session?.user?.name || 'Usuario'}
                pets={pets}
                onPostCreated={fetchPosts}
            />

            {loading ? (
                <StateFeedback status="loading" title="Cargando publicaciones" />
            ) : loadError ? (
                <StateFeedback
                    status="error"
                    title="No pudimos cargar las publicaciones"
                    description="Intentá de nuevo para ver la actividad de la comunidad."
                    action={<Button variant="outline" onClick={() => void postsQuery.refetch()}>Reintentar</Button>}
                />
            ) : posts.length === 0 ? (
                <Card className="gap-0 py-0">
                    <CardContent className="py-8 text-center">
                        <MessagesSquare className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden="true" />
                        <h2 className="mb-2 font-semibold text-foreground">{activeFilter ? 'Todavía no hay publicaciones de este tipo' : 'No hay publicaciones aún'}</h2>
                        <p className="text-sm text-muted-foreground">{activeFilter ? 'Probá con otro filtro o iniciá una conversación.' : '¡Sé el primero en compartir algo!'}</p>
                    </CardContent>
                </Card>
            ) : (
                posts.map(post => (
                    <PostCard
                        key={post.id}
                        post={post}
                        currentUserId={session?.user?.id}
                        onLike={() => void fetchPosts()}
                        onDelete={() => {
                            queryClient.setQueryData<InfiniteData<PostsPage, string | null>>(
                                viewerQueryKeys.posts(userId, activeFilter || ''),
                                current => current && {
                                    ...current,
                                    pages: current.pages.map(page => ({
                                        ...page,
                                        posts: page.posts.filter(item => item.id !== post.id),
                                    })),
                                },
                            );
                            fetchPosts();
                        }}
                        onEdit={(p) => setEditingPost(p as Post)}
                    />
                ))
            )}

            {!loading && !loadError && postsQuery.hasNextPage && (
                <div className="flex flex-col items-center gap-2 py-2">
                    {postsQuery.isFetchNextPageError && (
                        <p role="alert" className="text-sm text-destructive">No pudimos cargar más publicaciones.</p>
                    )}
                    <Button
                        variant="outline"
                        className="w-full max-w-xs"
                        disabled={postsQuery.isFetchingNextPage}
                        onClick={() => void postsQuery.fetchNextPage()}
                    >
                        {postsQuery.isFetchingNextPage ? (
                            <>
                                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                                Cargando…
                            </>
                        ) : (
                            <>
                                <ChevronDown className="mr-2 size-5" aria-hidden="true" />
                                {postsQuery.isFetchNextPageError ? 'Reintentar' : 'Cargar más'}
                            </>
                        )}
                    </Button>
                </div>
            )}

            {/* Edit Modal */}
            <EditPostModal
                post={editingPost}
                open={!!editingPost}
                onClose={() => setEditingPost(null)}
                onSave={fetchPosts}
            />
        </div>
    );
}
