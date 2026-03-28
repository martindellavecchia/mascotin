'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface Pet {
    id: string;
    name: string;
    images: string;
}

interface CreatePostCardProps {
    userImage?: string;
    userName?: string;
    pets?: Pet[];
    onPostCreated?: () => void;
}

type PostType = 'post' | 'photo' | 'event' | 'question';

export default function CreatePostCard({ userImage, userName, pets, onPostCreated }: CreatePostCardProps) {
    const [postType, setPostType] = useState<PostType>('post');
    const [content, setContent] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [selectedPetId, setSelectedPetId] = useState<string>('');
    const [eventDate, setEventDate] = useState('');
    const [eventLocation, setEventLocation] = useState('');
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || images.length >= 4) return;

        setUploading(true);
        for (let i = 0; i < files.length && images.length + i < 4; i++) {
            const file = files[i];
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Imagen muy grande (max 5MB)');
                continue;
            }

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

    const handleSubmit = async () => {
        if (!content.trim()) {
            toast.error('Escribe algo para publicar');
            return;
        }

        if (postType === 'event' && (!eventDate || !eventLocation)) {
            toast.error('Los eventos requieren fecha y ubicación');
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: content.trim(),
                    postType,
                    images: images,
                    petId: selectedPetId || undefined,
                    eventDate: postType === 'event' ? new Date(eventDate).toISOString() : undefined,
                    eventLocation: postType === 'event' ? eventLocation : undefined,
                }),
            });

            const data = await response.json();
            if (data.success || data.post) {
                toast.success('¡Publicación creada!');
                setContent('');
                setImages([]);
                setEventDate('');
                setEventLocation('');
                setIsExpanded(false);
                onPostCreated?.();
            } else {
                toast.error(data.error || 'Error al publicar');
            }
        } catch (error) {
            toast.error('Error al publicar');
        } finally {
            setSubmitting(false);
        }
    };

    const getPlaceholder = () => {
        switch (postType) {
            case 'photo': return '📷 Describe tu foto...';
            case 'event': return '📅 ¿De qué se trata el evento?';
            case 'question': return '❓ Haz una pregunta a la comunidad...';
            default: return '¿Qué está haciendo tu mascota?';
        }
    };

    const getIcon = (type: PostType) => {
        switch (type) {
            case 'photo': return 'photo_camera';
            case 'event': return 'event';
            case 'question': return 'help';
            default: return 'edit';
        }
    };

    return (
        <Card className="mb-6 shadow-sm">
            <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                        {userImage ? (
                            <AvatarImage src={userImage} />
                        ) : (
                            <AvatarFallback className="bg-teal-500 text-white">
                                {userName?.[0] || 'U'}
                            </AvatarFallback>
                        )}
                    </Avatar>
                    <div className="flex-1">
                        {!isExpanded ? (
                            <button
                                onClick={() => setIsExpanded(true)}
                                className="w-full text-left px-4 py-3 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                            >
                                ¿Qué está haciendo tu mascota?
                            </button>
                        ) : (
                            <div className="space-y-4">
                                {/* Post Type Tabs */}
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
                                    placeholder={getPlaceholder()}
                                    className="min-h-[100px] resize-none"
                                    autoFocus
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

                                {/* Image Preview */}
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

                                {/* Actions */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-2">
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
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading || images.length >= 4}
                                        >
                                            <span className="material-symbols-rounded text-teal-600">add_photo_alternate</span>
                                        </Button>

                                        {pets && pets.length > 0 && (
                                            <select
                                                value={selectedPetId}
                                                onChange={(e) => setSelectedPetId(e.target.value)}
                                                className="text-sm border rounded-lg px-2 py-1 text-slate-600"
                                            >
                                                <option value="">Sin mascota</option>
                                                {pets.map(pet => (
                                                    <option key={pet.id} value={pet.id}>{pet.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setIsExpanded(false);
                                                setContent('');
                                                setImages([]);
                                            }}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="bg-teal-500 hover:bg-teal-600"
                                            onClick={handleSubmit}
                                            disabled={submitting || !content.trim()}
                                        >
                                            {submitting ? 'Publicando...' : 'Publicar'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
