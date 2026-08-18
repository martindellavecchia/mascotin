'use client';

import { useState } from 'react';
import { Image as ImageIcon, MapPin, Send, Smile } from 'lucide-react';
import { Pet } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { getPrimaryImageUrl } from '@/lib/media';

interface CreatePostCardProps {
    pets: Pet[];
    selectedPetId?: string;
    onPostCreated?: () => void;
    userImage?: string | null;
}

export default function CreatePostCard({ pets, selectedPetId, onPostCreated, userImage }: CreatePostCardProps) {
    const [content, setContent] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    const activePet = pets.find(p => p.id === selectedPetId);
    const activePetImage = activePet
        ? getPrimaryImageUrl(activePet.images, activePet.thumbnailIndex)
        : null;

    return (
        <Card className="mb-6 min-w-0 border-teal-100/50 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex min-w-0 gap-3 sm:gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                    {activePetImage ? (
                        <img src={activePetImage} className="w-full h-full object-cover" alt={activePet?.name || 'Mascota'} />
                    ) : (
                        <Avatar className="w-full h-full">
                            <AvatarImage src={userImage || undefined} />
                            <AvatarFallback>Yo</AvatarFallback>
                        </Avatar>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div
                        className={`rounded-2xl bg-gray-50 px-3 py-2 transition-all sm:px-4 ${isExpanded ? 'bg-white ring-2 ring-teal-500/20' : ''}`}
                    >
                        <Textarea
                            placeholder={`Compartí una actualización sobre ${activePet?.name || 'tu mascota'}...`}
                            className="w-full bg-transparent border-none focus-visible:ring-0 p-0 text-sm resize-none min-h-[40px]"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onFocus={() => setIsExpanded(true)}
                            rows={isExpanded ? 3 : 1}
                        />
                    </div>

                    {isExpanded && (
                        <div className="mt-3 flex animate-in flex-col gap-3 fade-in slide-in-from-top-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 flex-wrap gap-1 sm:gap-2">
                                <Button variant="ghost" size="sm" className="min-h-10 rounded-md text-teal-600 hover:bg-teal-50 hover:text-teal-700">
                                    <ImageIcon className="mr-1 size-5" aria-hidden="true" />
                                    Foto
                                </Button>
                                <Button variant="ghost" size="sm" className="min-h-10 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                                    <MapPin className="mr-1 size-5" aria-hidden="true" />
                                    Ubicación
                                </Button>
                                <Button variant="ghost" size="sm" aria-label="Agregar estado de ánimo" className="min-h-10 min-w-10 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                                    <Smile className="mr-1 size-5" aria-hidden="true" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:flex">
                                <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)} className="min-h-10 text-gray-500">
                                    Cancelar
                                </Button>
                                <Button
                                    size="sm"
                                    className="min-h-10 rounded-md bg-teal-500 px-6 text-white hover:bg-teal-600"
                                    disabled={!content.trim()}
                                >
                                    Publicar
                                </Button>
                            </div>
                        </div>
                    )}
                    {!isExpanded && (
                        <div className="mt-2 flex min-w-0 items-center justify-between gap-2 pl-2">
                            <p className="min-w-0 text-xs text-gray-400 [overflow-wrap:anywhere]">Publicá fotos, consejos o preguntas...</p>
                            <Button variant="ghost" size="icon" aria-label="Expandir publicación" className="h-10 w-10 shrink-0 text-gray-500" onClick={() => setIsExpanded(true)}>
                                <Send className="size-5" aria-hidden="true" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
