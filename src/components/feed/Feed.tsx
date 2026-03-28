'use client';

import { useState, useEffect, useCallback } from 'react';
import { Post, Pet } from '@/types';
import PostCard from './PostCard';
import EditPostModal from '@/components/community/EditPostModal';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useFetchWithError } from '@/hooks/useFetchWithError';

interface ExtendedPost extends Post {
    postType?: string;
    eventDate?: string;
    eventLocation?: string;
    _count: {
        likes: number;
        comments: number;
    };
}

interface FeedProps {
    currentUserId?: string;
    currentUserImage?: string | null;
    pets: Pet[];
    selectedPetId?: string;
}

export default function Feed({ currentUserId, currentUserImage, pets, selectedPetId }: FeedProps) {
    const [posts, setPosts] = useState<ExtendedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [editingPost, setEditingPost] = useState<ExtendedPost | null>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const { fetchWithError } = useFetchWithError();

    const fetchPosts = useCallback(async (cursor?: string) => {
        const isLoadMore = !!cursor;
        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        const url = cursor
            ? `/api/posts?limit=10&cursor=${cursor}`
            : `/api/posts?limit=10`;

        const result = await fetchWithError<{ posts: ExtendedPost[]; nextCursor: string | null; hasMore: boolean }>(url, {
            timeout: 60000,
            retries: 2,
            retryDelay: 800
        });

        if (result.success && result.data) {
            const newPosts = result.data.posts || [];

            if (isLoadMore) {
                setPosts(prev => [...prev, ...newPosts]);
            } else {
                setPosts(newPosts);
            }

            setNextCursor(result.data.nextCursor || null);
            setHasMore(result.data.hasMore || false);
        } else {
            toast.error('Error cargando el feed');
        }

        setLoading(false);
        setLoadingMore(false);
    }, [fetchWithError]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const loadMore = () => {
        if (nextCursor && !loadingMore) {
            fetchPosts(nextCursor);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2].map(i => (
                    <div key={i} className="bg-white p-4 rounded-xl shadow-sm h-40 animate-pulse">
                        <div className="flex gap-3 mb-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-full" />
                            <div className="space-y-2 flex-1">
                                <div className="h-4 bg-gray-200 rounded w-1/3" />
                                <div className="h-3 bg-gray-200 rounded w-1/4" />
                            </div>
                        </div>
                        <div className="h-16 bg-gray-200 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                <span className="material-symbols-rounded text-4xl text-gray-300 mb-2">post_add</span>
                <p className="text-gray-500">No hay publicaciones aún.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {posts.map(post => (
                <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={currentUserId}
                    currentUserImage={currentUserImage}
                    onDelete={() => {
                        setPosts(prev => prev.filter(p => p.id !== post.id));
                    }}
                    onEdit={(p) => setEditingPost(p as ExtendedPost)}
                />
            ))}

            {/* Load More Button */}
            {hasMore && (
                <div className="flex justify-center py-4">
                    <Button
                        variant="outline"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="w-full max-w-xs"
                    >
                        {loadingMore ? (
                            <>
                                <span className="material-symbols-rounded animate-spin mr-2">progress_activity</span>
                                Cargando...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-rounded mr-2">expand_more</span>
                                Cargar más
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
                onSave={() => fetchPosts()}
            />
        </div>
    );
}
