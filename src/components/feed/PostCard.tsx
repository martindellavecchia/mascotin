'use client';

import { memo, useState, useEffect } from 'react';
import { Post, Comment } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import BusinessOwnerBadge from '@/components/business/BusinessOwnerBadge';
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
import { shouldUnoptimizeImage } from '@/lib/media';
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
    _count?: {
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

function PostCard({ post, currentUserId, currentUserImage, onLike, onDelete, onEdit }: PostCardProps) {
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
        <Card className={`mb-2 min-w-0 overflow-hidden shadow-sm ${deleting ? 'opacity-50' : ''} ${post.postType === 'lost_pet' ? (isResolved ? 'border border-green-200 bg-green-50/20' : 'border border-red-200 bg-red-50/20') : 'border-slate-100 bg-white'}`}>
            {/* Lost Pet Banner */}
            {post.postType === 'lost_pet' && (
                <div className={`flex flex-col items-start justify-between gap-2 border-b px-3 py-2 text-sm sm:flex-row sm:items-center ${isResolved ? 'bg-green-600 border-green-700' : 'bg-red-600 border-red-700'}`}>
                    <div className="flex min-w-0 items-center gap-1.5 text-white">
                        <span className="material-symbols-rounded">
                            {isResolved ? 'check_circle' : 'emergency'}
                        </span>
                        <span className="text-sm font-bold [overflow-wrap:anywhere]">
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
                            className={`min-h-9 shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-colors ${isResolved
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
            <div className="flex min-w-0 items-center gap-2.5 px-3 py-2.5">
                <span className="relative shrink-0">
                    <Avatar className="h-8 w-8 border border-slate-100">
                        <AvatarImage src={post.author?.image || undefined} />
                        <AvatarFallback>{post.author?.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    {post.author?.isBusinessOwner && <BusinessOwnerBadge compact />}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span className="min-w-0 text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{post.author?.name || 'Usuario'}</span>
                        {post.pet && (
                            <span className="inline-flex min-w-0 items-center gap-0.5 text-xs text-slate-500 [overflow-wrap:anywhere]">
                              con {post.pet.name}
                              <span className="material-symbols-rounded text-sm text-teal-600">pets</span>
                            </span>
                        )}
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                        <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: es })}</span>
                        {post.location && (
                            <>
                                <span>•</span>
                                <span className="flex min-w-0 items-start gap-0.5 [overflow-wrap:anywhere]">
                                    <span className="material-symbols-rounded shrink-0 text-[14px]">location_on</span>
                                    {post.location}
                                </span>
                            </>
                        )}
                    </div>
                </div>
                {/* Only show menu if user is the post author */}
                {currentUserId && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-slate-400">
                                <span className="material-symbols-rounded">more_horiz</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {post.author?.id === currentUserId && (
                                <>
                                    <DropdownMenuItem onClick={() => onEdit?.(post)}>
                                        <span className="material-symbols-rounded mr-2 text-slate-500">edit</span>
                                        Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                                        <span className="material-symbols-rounded mr-2">delete</span>
                                        Eliminar
                                    </DropdownMenuItem>
                                </>
                            )}
                            {post.author?.id !== currentUserId && post.author?.id && (
                                <DropdownMenuItem
                                    onClick={async () => {
                                        const response = await fetch('/api/reports', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                reportedId: post.author?.id,
                                                targetType: post.postType === 'lost_pet' || post.postType === 'found_pet' ? 'ALERT' : 'POST',
                                                targetId: post.id,
                                                reason: 'inappropriate',
                                            }),
                                        });
                                        const data = await response.json();
                                        toast[data.success ? 'success' : 'error'](
                                            data.success ? 'Publicación reportada' : data.error || 'No se pudo reportar'
                                        );
                                    }}
                                    className="text-red-600 focus:text-red-600"
                                >
                                    <span className="material-symbols-rounded mr-2">flag</span>
                                    Reportar
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Post Type Badge */}
            {post.postType && post.postType !== 'post' && (
                <div className="px-3 pb-1">
                    <Badge className={`text-[10px] py-0.5 ${post.postType === 'event' ? 'bg-teal-50 text-teal-800' :
                        post.postType === 'question' ? 'bg-orange-50 text-orange-700' :
                            post.postType === 'recommendation' ? 'bg-amber-50 text-amber-700' :
                            post.postType === 'photo' ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                        <span className="material-symbols-rounded text-sm mr-1">
                            {post.postType === 'event' ? 'event' : post.postType === 'question' ? 'help' : post.postType === 'recommendation' ? 'star' : 'photo_camera'}
                        </span>
                        {post.postType === 'event' ? 'Evento' : post.postType === 'question' ? 'Pregunta' : post.postType === 'recommendation' ? 'Recomendación' : 'Foto'}
                    </Badge>
                </div>
            )}

            {/* Content */}
            <div className="px-3 pb-2">
                <p className={`whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere] ${post.postType === 'question' ? 'font-medium text-slate-900' : 'text-slate-700'}`}>
                    {post.content}
                </p>
            </div>

            {/* Event Info */}
            {post.postType === 'event' && post.eventDate && (
                <div className="mx-3 mb-2 rounded-lg border border-teal-100 bg-teal-50 p-2.5">
                    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        <div className="flex shrink-0 flex-col items-center rounded-md bg-white px-2 py-1.5">
                            <span className="text-[10px] text-teal-700 font-bold uppercase">
                                {format(new Date(post.eventDate), 'MMM', { locale: es })}
                            </span>
                            <span className="text-xl font-bold text-teal-800">
                                {format(new Date(post.eventDate), 'd')}
                            </span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 text-sm text-teal-800">
                                <span className="material-symbols-rounded text-lg">schedule</span>
                                {format(new Date(post.eventDate), 'HH:mm')}
                            </div>
                            {post.eventLocation && (
                                <div className="mt-1 flex min-w-0 items-start gap-1 text-sm text-teal-700 [overflow-wrap:anywhere]">
                                    <span className="material-symbols-rounded shrink-0 text-lg">location_on</span>
                                    {post.eventLocation}
                                </div>
                            )}
                        </div>
                        {post.eventId && (
                            <Button
                                size="sm"
                                className={`min-h-10 w-full shrink-0 text-white transition-colors sm:w-auto ${isAttending ? 'bg-teal-800 hover:bg-teal-900' : 'bg-teal-700 hover:bg-teal-800'}`}
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
                            <div className="flex min-w-0 items-start gap-2 text-sm text-red-700">
                                <span className="material-symbols-rounded shrink-0 text-lg">location_on</span>
                                <span className="min-w-0 [overflow-wrap:anywhere]"><strong>Visto por última vez:</strong> {post.lastSeenLocation}</span>
                            </div>
                        )}
                        {post.contactPhone && (
                            <div className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-0.5 text-sm text-red-700">
                                <span className="material-symbols-rounded shrink-0 text-lg">call</span>
                                <span className="shrink-0"><strong>Contacto:</strong></span>
                                <a href={`tel:${post.contactPhone}`} className="inline-flex min-h-11 min-w-0 items-center font-bold underline [overflow-wrap:anywhere] hover:text-red-800">
                                    {post.contactPhone}
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Images */}
            {post.primaryImageUrl && (
                <div className="relative h-[220px] w-full bg-slate-100 sm:h-[280px]">
                    <Image
                        src={post.primaryImageUrl}
                        alt="Contenido de la publicación"
                        fill
                        unoptimized={shouldUnoptimizeImage(post.primaryImageUrl)}
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 600px"
                    />
                </div>
            )}

            {/* Footer / Stats */}
            {(likeCount > 0 || (post._count?.comments || 0) > 0) && (
                <div className="px-3 py-1 flex justify-between text-[10px] text-slate-400">
                    <span>{likeCount} likes</span>
                    <span>{comments.length || post._count?.comments || 0} comentarios</span>
                </div>
            )}

            {/* Comments Section */}
            {showComments && (
                <div className="bg-slate-50 border-t border-slate-100 px-3 py-2 space-y-2">
                    {loadingComments ? (
                        <div className="flex justify-center py-2">
                            <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {comments.map(comment => (
                                <div key={comment.id} className="flex min-w-0 gap-1.5 text-xs">
                                    <span className="relative mt-0.5 shrink-0">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={comment.author.image || undefined} />
                                            <AvatarFallback>{comment.author.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        {comment.author.isBusinessOwner && <BusinessOwnerBadge compact className="-bottom-1.5 -right-1.5" />}
                                    </span>
                                    <div className="min-w-0 max-w-full rounded-lg bg-white px-2 py-1 text-xs [overflow-wrap:anywhere]">
                                        <span className="mr-1 font-semibold">{comment.author.name}</span>
                                        <span className="text-slate-700">{comment.content}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-1 flex min-w-0 items-center gap-1.5">
                        <Avatar className="h-6 w-6 shrink-0">
                            {currentUserImage ? (
                                <AvatarImage src={currentUserImage} />
                            ) : (
                                <AvatarFallback className="bg-teal-500 text-white text-xs">Yo</AvatarFallback>
                            )}
                        </Avatar>
                        <div className="relative min-w-0 flex-1">
                            <input
                                type="text"
                                placeholder="Escribe un comentario..."
                                className="min-h-10 w-full rounded-full border border-slate-200 py-2 pl-3 pr-11 text-xs focus:border-teal-400 focus:outline-none"
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
                                aria-label="Enviar comentario"
                                className="absolute right-0 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:text-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 disabled:opacity-50"
                            >
                                <span className="material-symbols-rounded text-[20px]">send</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex min-w-0 items-center border-t border-slate-50 px-1 py-0.5">
                <Button
                    variant="ghost"
                    className={`min-w-0 flex-1 gap-1 px-2 sm:gap-2 ${isLiked ? 'text-teal-600 hover:text-teal-700 hover:bg-teal-50' : 'text-slate-500 hover:text-slate-600'}`}
                    onClick={handleLike}
                    aria-label={isLiked ? 'Quitar me gusta' : 'Me gusta'}
                    aria-pressed={isLiked}
                >
                    <span className={`material-symbols-rounded text-[16px] ${isLiked ? 'filled' : ''}`}>favorite</span>
                    <span className="text-xs">Me gusta</span>
                </Button>

                <Button
                    variant="ghost"
                    className={`min-w-0 flex-1 gap-1 px-2 sm:gap-2 ${showComments ? 'text-teal-500 bg-teal-50' : 'text-slate-500 hover:text-slate-600'}`}
                    onClick={() => setShowComments(!showComments)}
                    aria-label={showComments ? 'Ocultar comentarios' : 'Mostrar comentarios'}
                    aria-expanded={showComments}
                >
                    <span className="material-symbols-rounded text-[16px]">chat_bubble</span>
                    <span className="text-xs">Comentar</span>
                </Button>

                <Button variant="ghost" size="sm" className="min-w-0 flex-1 gap-1 px-2 text-slate-500 hover:text-slate-600">
                    <span className="material-symbols-rounded text-[16px]">share</span>
                    <span className="text-xs">Compartir</span>
                </Button>
            </div>
        </Card>
    );
}

export default memo(PostCard);
