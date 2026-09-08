'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { MapPin, MessagesSquare } from 'lucide-react';
import CreatePostCard from '@/components/community/CreatePostCard';
import EditPostModal from '@/components/community/EditPostModal';
import PostCard from '@/components/feed/PostCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StateFeedback } from '@/components/ui/state-feedback';

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

interface Pet {
    id: string;
    name: string;
    images: string;
}

interface EventsFeedProps {
    refreshKey?: number;
}

export default function EventsFeed({ refreshKey = 0 }: EventsFeedProps) {
    const { data: session } = useSession();
    const [posts, setPosts] = useState<Post[]>([]);
    const [pets, setPets] = useState<Pet[]>([]);
    const [loading, setLoading] = useState(true);
    const [ownerImage, setOwnerImage] = useState<string | undefined>();
    const [ownerLocation, setOwnerLocation] = useState<string | null>(null);
    const [ownerLoaded, setOwnerLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const latestRequest = useRef(0);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [activeFilter, setActiveFilter] = useState('');

    useEffect(() => {
        if (!session?.user?.id) return;
        fetchPosts();
    }, [session?.user?.id, refreshKey]);

    useEffect(() => {
        if (!session?.user?.id) return;
        fetchPets();
        fetchOwnerImage();
    }, [session?.user?.id]);

    const fetchPosts = async (showLoading = false) => {
        const requestId = ++latestRequest.current;
        if (showLoading) setLoading(true);
        setLoadError(false);
        try {
            const params = new URLSearchParams(window.location.search);
            const postType = params.get('filter');
            setActiveFilter(postType || '');
            const url = postType ? `/api/posts?limit=20&postType=${postType}` : '/api/posts?limit=20';
            const response = await fetch(url);
            const data = await response.json();
            if (!response.ok || !Array.isArray(data.posts)) throw new Error('No se pudieron cargar las publicaciones');
            if (requestId === latestRequest.current) {
                setPosts(data.posts);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
            if (requestId === latestRequest.current) setLoadError(true);
        } finally {
            if (requestId === latestRequest.current) setLoading(false);
        }
    };

    const fetchPets = async () => {
        try {
            const response = await fetch('/api/pet/mine');
            const data = await response.json();
            if (data.pets) {
                setPets(data.pets);
            }
        } catch (error) {
            console.error('Error fetching pets:', error);
        }
    };

    const fetchOwnerImage = async () => {
        try {
            const response = await fetch('/api/owner/profile');
            const data = await response.json();
            if (data.success) {
                setOwnerImage(data.owner?.image || undefined);
                setOwnerLocation(data.owner?.location || null);
                setOwnerLoaded(true);
            }
        } catch (error) {
            console.error('Error fetching owner:', error);
        }
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
                            void fetchPosts(true);
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
                    action={<Button variant="outline" onClick={() => void fetchPosts(true)}>Reintentar</Button>}
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
                            setPosts(prev => prev.filter(p => p.id !== post.id));
                        }}
                        onEdit={(p) => setEditingPost(p as Post)}
                    />
                ))
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
