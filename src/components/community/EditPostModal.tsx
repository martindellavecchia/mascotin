'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface EditPostModalProps {
    post: {
        id: string;
        content: string;
        images?: string;
        postType?: string;
        eventDate?: string;
        eventLocation?: string;
    } | null;
    open: boolean;
    onClose: () => void;
    onSave: () => void;
}

type PostType = 'post' | 'photo' | 'event' | 'question';

export default function EditPostModal({ post, open, onClose, onSave }: EditPostModalProps) {
    const [content, setContent] = useState('');
    const [postType, setPostType] = useState<PostType>('post');
    const [eventDate, setEventDate] = useState('');
    const [eventLocation, setEventLocation] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (post) {
            setContent(post.content || '');
            setPostType((post.postType as PostType) || 'post');
            setEventDate(post.eventDate ? new Date(post.eventDate).toISOString().slice(0, 16) : '');
            setEventLocation(post.eventLocation || '');
            try {
                const parsed = typeof post.images === 'string' ? JSON.parse(post.images) : post.images;
                setImages(Array.isArray(parsed) ? parsed : []);
            } catch {
                setImages([]);
            }
        }
    }, [post]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || images.length >= 4) return;

        setUploading(true);
        for (let i = 0; i < files.length && images.length + i < 4; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });
                const data = await response.json();
                if (data.success && data.url) {
                    setImages(prev => [...prev, data.url]);
                }
            } catch (error) {
                toast.error('Error al subir imagen');
            }
        }
        setUploading(false);
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!post || !content.trim()) {
            toast.error('El contenido no puede estar vacío');
            return;
        }

        if (postType === 'event' && (!eventDate || !eventLocation)) {
            toast.error('Los eventos requieren fecha y ubicación');
            return;
        }

        setSaving(true);
        try {
            const response = await fetch(`/api/posts/${post.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: content.trim(),
                    postType,
                    images,
                    eventDate: postType === 'event' ? new Date(eventDate).toISOString() : null,
                    eventLocation: postType === 'event' ? eventLocation : null,
                }),
            });

            if (response.ok) {
                toast.success('Publicación actualizada');
                onSave();
                onClose();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Error al actualizar');
            }
        } catch (error) {
            toast.error('Error al actualizar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Editar Publicación</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Post Type */}
                    <Tabs value={postType} onValueChange={(v) => setPostType(v as PostType)}>
                        <TabsList className="grid grid-cols-4 w-full">
                            <TabsTrigger value="post" className="text-xs gap-1">
                                <span className="material-symbols-rounded text-sm">edit</span>
                                Texto
                            </TabsTrigger>
                            <TabsTrigger value="photo" className="text-xs gap-1">
                                <span className="material-symbols-rounded text-sm">photo_camera</span>
                                Foto
                            </TabsTrigger>
                            <TabsTrigger value="event" className="text-xs gap-1">
                                <span className="material-symbols-rounded text-sm">event</span>
                                Evento
                            </TabsTrigger>
                            <TabsTrigger value="question" className="text-xs gap-1">
                                <span className="material-symbols-rounded text-sm">help</span>
                                Pregunta
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Content */}
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="¿Qué querés compartir?"
                        className="min-h-[120px] resize-none"
                    />

                    {/* Event Fields */}
                    {postType === 'event' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha y hora</label>
                                <Input
                                    type="datetime-local"
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">Ubicación</label>
                                <Input
                                    placeholder="Parque, plaza..."
                                    value={eventLocation}
                                    onChange={(e) => setEventLocation(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Images */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-slate-600">Imágenes</span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading || images.length >= 4}
                            >
                                <span className="material-symbols-rounded text-teal-600 mr-1">add_photo_alternate</span>
                                Agregar
                            </Button>
                        </div>
                        {images.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                                {images.map((img, idx) => (
                                    <div key={idx} className="relative w-20 h-20">
                                        <img src={img} alt="" className="w-full h-full object-cover rounded-lg" />
                                        <button
                                            onClick={() => removeImage(idx)}
                                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !content.trim()}
                        className="bg-teal-500 hover:bg-teal-600"
                    >
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
