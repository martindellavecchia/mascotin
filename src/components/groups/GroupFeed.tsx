'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import PostCard from '@/components/feed/PostCard';

interface GroupFeedProps {
    groupId: string;
    currentUser: {
        id: string;
        name: string;
        image: string | null;
    } | null;
}

export default function GroupFeed({ groupId, currentUser }: GroupFeedProps) {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form States
    const [activeTab, setActiveTab] = useState('post');
    const [content, setContent] = useState('');
    const [image, setImage] = useState('');

    // Event specific states
    const [eventTitle, setEventTitle] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventLocation, setEventLocation] = useState('');

    const [uploading, setUploading] = useState(false);
    const [creating, setCreating] = useState(false);

    const fetchPosts = async () => {
        try {
            const res = await fetch(`/api/groups/${groupId}/posts`);
            const data = await res.json();
            if (data.success) {
                setPosts(data.posts);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [groupId]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen debe ser menor a 5MB');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Error al subir');

            const data = await res.json();
            if (data.url) {
                setImage(data.url);
                toast.success('Imagen subida');
            }
        } catch (error) {
            toast.error('Error al subir imagen');
        } finally {
            setUploading(false);
        }
    };

    const handleCreatePost = async () => {
        if (!content.trim()) return;
        if (!currentUser) return toast.error('Debes iniciar sesión');

        // Validate event fields
        if (activeTab === 'event') {
            if (!eventTitle || !eventDate || !eventLocation) {
                return toast.error('Completa todos los campos del evento');
            }
        }

        setCreating(true);
        try {
            const payload = {
                content,
                image: image || undefined,
                postType: activeTab,
                // Event specific
                title: activeTab === 'event' ? eventTitle : undefined,
                eventDate: activeTab === 'event' ? eventDate : undefined,
                eventLocation: activeTab === 'event' ? eventLocation : undefined,
            };

            const res = await fetch(`/api/groups/${groupId}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (data.success) {
                setContent('');
                setImage('');
                setEventTitle('');
                setEventDate('');
                setEventLocation('');
                toast.success(activeTab === 'event' ? 'Evento creado' : 'Publicación creada');
                fetchPosts();
            } else {
                toast.error(data.error || 'Error al crear');
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setCreating(false);
        }
    };

    const handleDeletePost = (postId: string) => {
        setPosts(posts.filter(p => p.id !== postId));
    };

    return (
        <div className="space-y-6">
            <Card className="bg-white shadow-sm border-slate-100 overflow-hidden">
                <Tabs defaultValue="post" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="bg-slate-50 border-b px-4 pt-2">
                        <TabsList className="bg-transparent h-auto p-0 gap-4">
                            <TabsTrigger
                                value="post"
                                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 pb-2 text-slate-500 data-[state=active]:text-teal-600 transition-none"
                            >
                                <span className="material-symbols-rounded mr-2 text-lg">edit</span>
                                Publicación
                            </TabsTrigger>
                            <TabsTrigger
                                value="event"
                                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 pb-2 text-slate-500 data-[state=active]:text-teal-600 transition-none"
                            >
                                <span className="material-symbols-rounded mr-2 text-lg">event</span>
                                Evento
                            </TabsTrigger>
                            <TabsTrigger
                                value="question"
                                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 pb-2 text-slate-500 data-[state=active]:text-teal-600 transition-none"
                            >
                                <span className="material-symbols-rounded mr-2 text-lg">help</span>
                                Pregunta
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="p-4">
                        <div className="flex gap-4">
                            <Avatar className="mt-1">
                                <AvatarImage src={currentUser?.image || undefined} />
                                <AvatarFallback>{currentUser?.name?.[0] || 'U'}</AvatarFallback>
                            </Avatar>

                            <div className="flex-1 space-y-4">
                                <TabsContent value="post" className="m-0 space-y-4">
                                    <Textarea
                                        placeholder={`¿Qué quieres compartir con el grupo?`}
                                        className="bg-slate-50 border-0 focus-visible:ring-1 focus-visible:ring-teal-500 resize-none min-h-[80px]"
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                    />
                                </TabsContent>

                                <TabsContent value="question" className="m-0 space-y-4">
                                    <Textarea
                                        placeholder={`Haz una pregunta al grupo...`}
                                        className="bg-slate-50 border-0 focus-visible:ring-1 focus-visible:ring-teal-500 resize-none min-h-[80px] text-lg font-medium placeholder:font-normal"
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                    />
                                </TabsContent>

                                <TabsContent value="event" className="m-0 space-y-3">
                                    <Input
                                        placeholder="Título del evento"
                                        className="font-bold"
                                        value={eventTitle}
                                        onChange={(e) => setEventTitle(e.target.value)}
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            type="datetime-local"
                                            value={eventDate}
                                            onChange={(e) => setEventDate(e.target.value)}
                                        />
                                        <Input
                                            placeholder="Ubicación"
                                            value={eventLocation}
                                            onChange={(e) => setEventLocation(e.target.value)}
                                        />
                                    </div>
                                    <Textarea
                                        placeholder="Descripción del evento..."
                                        className="bg-slate-50 border-0 focus-visible:ring-1 focus-visible:ring-teal-500 resize-none min-h-[60px]"
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                    />
                                </TabsContent>

                                {/* Image Preview */}
                                {image && (
                                    <div className="relative w-full h-48 bg-slate-100 rounded-lg overflow-hidden">
                                        <img src={image} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setImage('')}
                                            className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                                        >
                                            <span className="material-symbols-rounded text-sm">close</span>
                                        </button>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-2">
                                    <label className={`cursor-pointer flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <span className="material-symbols-rounded">image</span>
                                        {uploading ? 'Subiendo...' : 'Agregar foto'}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImageUpload}
                                            disabled={uploading}
                                        />
                                    </label>

                                    <Button
                                        onClick={handleCreatePost}
                                        disabled={!content.trim() || creating || uploading}
                                        className="bg-teal-500 hover:bg-teal-600 text-white rounded-full px-6"
                                    >
                                        {creating ? 'Publicando...' : 'Publicar'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Tabs>
            </Card>

            {/* Post List */}
            {loading ? (
                <div className="text-center py-8 text-slate-500 animate-pulse">Cargando publicaciones...</div>
            ) : posts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-200">
                    <span className="material-symbols-rounded text-4xl text-slate-300 mb-2">chat_bubble_outline</span>
                    <p className="text-slate-500">Aún no hay publicaciones. ¡Comienza la conversación!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {posts.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            currentUserId={currentUser?.id}
                            onDelete={handleDeletePost}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
