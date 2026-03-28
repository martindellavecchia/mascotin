'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import CreatePostCard from './CreatePostCard';
import EditPostModal from './EditPostModal';
import PostCard from '@/components/feed/PostCard';
import { Card, CardContent } from '@/components/ui/card';

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
    const [editingPost, setEditingPost] = useState<Post | null>(null);

    useEffect(() => {
        if (!session?.user?.id) return;
        fetchPosts();
    }, [session?.user?.id, refreshKey]);

    useEffect(() => {
        if (!session?.user?.id) return;
        fetchPets();
        fetchOwnerImage();
    }, [session?.user?.id]);

    const fetchPosts = async () => {
        try {
            const response = await fetch('/api/posts?limit=20');
            const data = await response.json();
            if (data.posts) {
                setPosts(data.posts);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
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
            if (data.success && data.owner?.image) {
                setOwnerImage(data.owner.image);
            }
        } catch (error) {
            console.error('Error fetching owner:', error);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <Card className="p-6 animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                        <div className="flex-1 h-10 bg-slate-200 rounded-full"></div>
                    </div>
                </Card>
                {[1, 2].map(i => (
                    <Card key={i} className="p-6 animate-pulse">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                            </div>
                            <div className="h-4 bg-slate-200 rounded w-full"></div>
                            <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <CreatePostCard
                userImage={ownerImage || session?.user?.image || undefined}
                userName={session?.user?.name || 'Usuario'}
                pets={pets}
                onPostCreated={fetchPosts}
            />

            {posts.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <span className="material-symbols-rounded text-5xl text-slate-300 mb-4 block">forum</span>
                        <h3 className="font-semibold text-slate-700 mb-2">No hay publicaciones aún</h3>
                        <p className="text-sm text-slate-500">¡Sé el primero en compartir algo!</p>
                    </CardContent>
                </Card>
            ) : (
                posts.map(post => (
                    <PostCard
                        key={post.id}
                        post={post}
                        currentUserId={session?.user?.id}
                        onLike={async () => {
                            try {
                                await fetch(`/api/posts/${post.id}/like`, { method: 'POST' });
                                fetchPosts();
                            } catch (error) {
                                console.error('Error liking post:', error);
                            }
                        }}
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