'use client';

import { useState, useEffect } from 'react';
import { Post, Comment } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import Image from 'next/image';

interface ExtendedPost extends Post {
    postType?: string;
    eventDate?: string;
    eventLocation?: string;
    isLiked?: boolean;
    isAttending?: boolean;
    eventId?: string;
    contactPhone?: string;
    lastSeenLocation?: string;
    isResolved?: boolean;
    _count: {
        likes: number;
        comments: number;
    };
}

interface PostCardProps {
    post: ExtendedPost;
    currentUserId?: string;
    currentUserImage?: string | null;
    onLike?: () => void;
    onDelete?: (postId: string) => void;
    onEdit?: (post: ExtendedPost) => void;
}

export default function PostCard({ post, currentUserId, currentUserImage, onLike, onDelete, onEdit }: PostCardProps) {
    const [isLiked, setIsLiked] = useState(post.isLiked || false);
    const [likeCount, setLikeCount] = useState(post._count?.likes || 0);
    const [deleting, setDeleting] = useState(false);

    // Event Attendance
    const [isAttending, setIsAttending] = useState(post.isAttending || false);
    const [isResolved, setIsResolved] = useState(post.isResolved || false);

    // Comments state
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState('');

    // Parse images
    let images: string[] = [];
    try {
        images = typeof post.images === 'string' ? JSON.parse(post.images) : post.images;
    } catch (e) {
        images = [];
    }

    useEffect(() => {
        setIsResolved(post.isResolved || false);
    }, [post.isResolved]);

    useEffect(() => {
        if (showComments && comments.length === 0) {
            setLoadingComments(true);
            fetch(`/api/posts/${post.id}/comments`)
                .then(res => res.json())
                .then(data => {
                    if (data.comments) setComments(data.comments);
                })
                .catch(() => toast.error('Error al cargar comentarios'))
                .finally(() => setLoadingComments(false));
        }
    }, [showComments, post.id, comments.length]);

    const handleLike = async () => {
        // Optimistic update
        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);

        try {
            await fetch(`/api/posts/${post.id}/like`, { method: 'POST' });
            onLike?.();
        } catch (error) {
            // Revert
            setIsLiked(!newIsLiked);
            setLikeCount(prev => newIsLiked ? prev - 1 : prev + 1);
        }
    };

    const handleAttend = async () => {
        if (!post.eventId) return;

        // Optimistic
        const previousState = isAttending;
        setIsAttending(!previousState);

        try {
            const res = await fetch(`/api/events/${post.eventId}/attend`, { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                setIsAttending(data.attending);
                toast.success(data.attending ? '¡Te anotaste!' : 'Ya no asistirás');
            } else {
                setIsAttending(previousState);
                toast.error('Error al actualizar asistencia');
            }
        } catch (error) {
            setIsAttending(previousState);
            toast.error('Error de conexión');
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        try {
            const res = await fetch(`/api/posts/${post.id}/comments`, {
                method: 'POST',
                body: JSON.stringify({ content: newComment }),
            });
            const data = await res.json();

            if (data.comment) {
                setComments([...comments, data.comment]);
                setNewComment('');
            }
        } catch {
            toast.error('Error al agregar comentario');
        }
    };

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de que querés eliminar esta publicación?')) return;

        setDeleting(true);
        try {
            const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Publicación eliminada');
                onDelete?.(post.id);
            } else {
                toast.error('Error al eliminar');
            }
        } catch (error) {
            toast.error('Error al eliminar');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Card className={`mb-2 shadow-sm overflow-hidden ${deleting ? 'opacity-50' : ''} ${post.postType === 'lost_pet' ? (isResolved ? 'border border-green-200 bg-green-50/20' : 'border border-red-200 bg-red-50/20') : 'border-gray-100 bg-white'}`}>
            {/* Lost Pet Banner */}
            {post.postType === 'lost_pet' && (
                <div className={`px-3 py-1.5 flex items-center justify-between text-sm ${isResolved ? 'bg-gradient-to-r from-green-500 to-teal-500' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}>
                    <div className="flex items-center gap-1.5 text-white">
                        <span className={`material-symbols-rounded ${isResolved ? '' : 'animate-pulse'}`}>
                            {isResolved ? 'check_circle' : 'emergency'}
                        </span>
                        <span className="text-sm font-bold">
                            {isResolved ? '¡MASCOTA ENCONTRADA!' : 'MASCOTA PERDIDA'}
                        </span>
                    </div>
                    {currentUserId && post.author?.id === currentUserId && (
                        <button
                            onClick={async () => {
                                const targetResolvedState = !isResolved;

                                try {
                                    const res = await fetch(`/api/posts/${post.id}/resolve`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ isResolved: targetResolvedState }),
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        const updatedState = typeof data.post?.isResolved === 'boolean'
                                            ? data.post.isResolved
                                            : targetResolvedState;
                                        setIsResolved(updatedState);
                                        toast.success(data.message || 'Estado actualizado');
                                    } else {
                                        toast.error(data.error || 'No se pudo actualizar el estado');
                                    }
                                } catch {
                                    toast.error('Error al actualizar');
                                }
                            }}
                            className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${isResolved
                                ? 'bg-white/20 hover:bg-white/30 text-white'
                                : 'bg-white text-green-600 hover:bg-green-50'
                                }`}
                        >
                            {isResolved ? 'Reactivar alerta' : '¡Lo encontré!'}
                        </button>
                    )}
                </div>
            )}
            {/* Header */}
            <div className="px-3 py-2.5 flex items-center gap-2.5">
                <Avatar className="h-8 w-8 border border-gray-100">
                    <AvatarImage src={post.author?.image || undefined} />
                    <AvatarFallback>{post.author?.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-gray-900">{post.author?.name || 'Usuario'}</span>
                        {post.pet && (
                            <span className="text-xs text-gray-500">con {post.pet.name}{post.pet?.petType === 'dog' ? '🐕' : post.pet?.petType === 'cat' ? '🐈' : '🐾'}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: es })}</span>
                        {post.location && (
                            <>
                                <span>•</span>
                                <span className="flex items-center gap-0.5">
                                    <span className="material-symbols-rounded text-[14px]">location_on</span>
                                    {post.location}
                                </span>
                            </>
                        )}
                    </div>
                </div>
                {/* Only show menu if user is the post author */}
                {currentUserId && post.author?.id === currentUserId && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                                <span className="material-symbols-rounded">more_horiz</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit?.(post)}>
                                <span className="material-symbols-rounded mr-2 text-slate-500">edit</span>
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                                <span className="material-symbols-rounded mr-2">delete</span>
                                Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Post Type Badge */}
            {post.postType && post.postType !== 'post' && (
                <div className="px-3 pb-1">
                    <Badge className={`text-[10px] py-0.5 ${post.postType === 'event' ? 'bg-purple-100 text-purple-700' :
                        post.postType === 'question' ? 'bg-orange-100 text-orange-700' :
                            post.postType === 'photo' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                        <span className="material-symbols-rounded text-sm mr-1">
                            {post.postType === 'event' ? 'event' : post.postType === 'question' ? 'help' : 'photo_camera'}
                        </span>
                        {post.postType === 'event' ? 'Evento' : post.postType === 'question' ? 'Pregunta' : 'Foto'}
                    </Badge>
                </div>
            )}

            {/* Content */}
            <div className="px-3 pb-2">
                <p className={`whitespace-pre-wrap text-sm leading-relaxed ${post.postType === 'question' ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                    {post.content}
                </p>
            </div>

            {/* Event Info */}
            {post.postType === 'event' && post.eventDate && (
                <div className="mx-3 mb-2 p-2.5 bg-purple-50 rounded-lg border border-purple-100">
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center bg-white px-2 py-1.5 rounded-md">
                            <span className="text-[10px] text-purple-600 font-bold uppercase">
                                {format(new Date(post.eventDate), 'MMM', { locale: es })}
                            </span>
                            <span className="text-xl font-bold text-purple-700">
                                {format(new Date(post.eventDate), 'd')}
                            </span>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-1 text-sm text-purple-700">
                                <span className="material-symbols-rounded text-lg">schedule</span>
                                {format(new Date(post.eventDate), 'HH:mm')}
                            </div>
                            {post.eventLocation && (
                                <div className="flex items-center gap-1 text-sm text-purple-600 mt-1">
                                    <span className="material-symbols-rounded text-lg">location_on</span>
                                    {post.eventLocation}
                                </div>
                            )}
                        </div>
                        {post.eventId && (
                            <Button
                                size="sm"
                                className={`${isAttending ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} text-white transition-colors`}
                                onClick={handleAttend}
                            >
                                {isAttending ? (
                                    <>
                                        <span className="material-symbols-rounded text-sm mr-1">check</span>
                                        Asistiré
                                    </>
                                ) : 'Asistir'}
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Lost Pet Contact Info */}
            {post.postType === 'lost_pet' && (post.contactPhone || post.lastSeenLocation) && (
                <div className="mx-3 mb-2 p-2 bg-red-50 rounded-lg border border-red-200">
                    <div className="space-y-1">
                        {post.lastSeenLocation && (
                            <div className="flex items-center gap-2 text-sm text-red-700">
                                <span className="material-symbols-rounded text-lg">location_on</span>
                                <span><strong>Visto por última vez:</strong> {post.lastSeenLocation}</span>
                            </div>
                        )}
                        {post.contactPhone && (
                            <div className="flex items-center gap-2 text-sm text-red-700">
                                <span className="material-symbols-rounded text-lg">call</span>
                                <span><strong>Contacto:</strong></span>
                                <a href={`tel:${post.contactPhone}`} className="font-bold underline hover:text-red-800">
                                    {post.contactPhone}
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Images */}
            {images && images.length > 0 && (
                <div className="relative bg-gray-100 w-full h-[280px]">
                    <Image
                        src={images[0]}
                        alt="Contenido de la publicación"
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 600px"
                    />
                </div>
            )}

            {/* Footer / Stats */}
            {(likeCount > 0 || (post._count?.comments || 0) > 0) && (
                <div className="px-3 py-1 flex justify-between text-[10px] text-gray-400">
                    <span>{likeCount} likes</span>
                    <span>{comments.length || post._count?.comments || 0} comentarios</span>
                </div>
            )}

            {/* Comments Section */}
            {showComments && (
                <div className="bg-gray-50 border-t border-gray-100 px-3 py-2 space-y-2">
                    {loadingComments ? (
                        <div className="flex justify-center py-2">
                            <span className="material-symbols-rounded animate-spin text-gray-400">progress_activity</span>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {comments.map(comment => (
                                <div key={comment.id} className="flex gap-1.5 text-xs">
                                    <Avatar className="h-6 w-6 mt-0.5">
                                        <AvatarImage src={comment.author.image || undefined} />
                                        <AvatarFallback>{comment.author.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="bg-white px-2 py-1 rounded-lg text-xs">
                                        <span className="font-semibold mr-1">{comment.author.name}</span>
                                        <span className="text-gray-700">{comment.content}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-1.5 items-center mt-1">
                        <Avatar className="h-6 w-6">
                            {currentUserImage ? (
                                <AvatarImage src={currentUserImage} />
                            ) : (
                                <AvatarFallback className="bg-teal-500 text-white text-xs">Yo</AvatarFallback>
                            )}
                        </Avatar>
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Escribe un comentario..."
                                className="w-full rounded-full border border-gray-200 pl-3 pr-8 py-1.5 text-xs focus:outline-none focus:border-teal-400"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAddComment();
                                    }
                                }}
                            />
                            <button
                                onClick={handleAddComment}
                                disabled={!newComment.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-teal-500 disabled:opacity-50"
                            >
                                <span className="material-symbols-rounded text-[20px]">send</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="px-1 py-0.5 flex items-center border-t border-gray-50">
                <Button
                    variant="ghost"
                    className={`flex-1 gap-2 ${isLiked ? 'text-red-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-500 hover:text-gray-600'}`}
                    onClick={handleLike}
                    aria-label={isLiked ? 'Quitar me gusta' : 'Me gusta'}
                    aria-pressed={isLiked}
                >
                    <span className={`material-symbols-rounded text-[16px] ${isLiked ? 'filled' : ''}`}>favorite</span>
                    <span className="text-xs">Me gusta</span>
                </Button>

                <Button
                    variant="ghost"
                    className={`flex-1 gap-2 ${showComments ? 'text-teal-500 bg-teal-50' : 'text-gray-500 hover:text-gray-600'}`}
                    onClick={() => setShowComments(!showComments)}
                    aria-label={showComments ? 'Ocultar comentarios' : 'Mostrar comentarios'}
                    aria-expanded={showComments}
                >
                    <span className="material-symbols-rounded text-[16px]">chat_bubble</span>
                    <span className="text-xs">Comentar</span>
                </Button>

                <Button variant="ghost" size="sm" className="flex-1 gap-1 text-gray-500 hover:text-gray-600 h-8">
                    <span className="material-symbols-rounded text-[16px]">share</span>
                    <span className="text-xs">Compartir</span>
                </Button>
            </div>
        </Card>
    );
}