'use client';

import { useState } from 'react';
import { Pet } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

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

    return (
        <Card className="mb-6 p-4 shadow-sm border-teal-100/50 bg-white">
            <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                    {activePet?.images && activePet.images.length > 0 ? (
                        <img src={JSON.parse(activePet.images)[0] || activePet.images[0]} className="w-full h-full object-cover" alt="Pet" />
                    ) : (
                        <Avatar className="w-full h-full">
                            <AvatarImage src={userImage || undefined} />
                            <AvatarFallback>Yo</AvatarFallback>
                        </Avatar>
                    )}
                </div>

                <div className="flex-1">
                    <div
                        className={`bg-gray-50 rounded-2xl px-4 py-2 transition-all ${isExpanded ? 'ring-2 ring-[teal-500]/20 bg-white' : ''}`}
                    >
                        <Textarea
                            placeholder={`Comparte una actualización sobre ${activePet?.name || 'tu mascota'}...`}
                            className="w-full bg-transparent border-none focus-visible:ring-0 p-0 text-sm resize-none min-h-[40px]"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onFocus={() => setIsExpanded(true)}
                            rows={isExpanded ? 3 : 1}
                        />
                    </div>

                    {isExpanded && (
                        <div className="flex justify-between items-center mt-3 animate-in fade-in slide-in-from-top-2">
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-full">
                                    <span className="material-symbols-rounded text-[20px] mr-1">image</span>
                                    Foto
                                </Button>
                                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                                    <span className="material-symbols-rounded text-[20px] mr-1">location_on</span>
                                    Ubicación
                                </Button>
                                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                                    <span className="material-symbols-rounded text-[20px] mr-1">sentiment_satisfied</span>
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)} className="text-gray-500">
                                    Cancelar
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-teal-500 hover:bg-teal-600 text-white rounded-full px-6"
                                    disabled={!content.trim()}
                                >
                                    Publicar
                                </Button>
                            </div>
                        </div>
                    )}
                    {!isExpanded && (
                        <div className="flex justify-between items-center mt-2 pl-2">
                            <p className="text-xs text-gray-400">Publica fotos, consejos o preguntas...</p>
                            <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => setIsExpanded(true)}>
                                <span className="material-symbols-rounded">send</span>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
