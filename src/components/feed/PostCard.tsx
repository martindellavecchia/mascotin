'use client';

import { memo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
    CalendarDays,
    Check,
    CircleAlert,
    CircleCheck,
    CircleHelp,
    Clock,
    Flag,
    HandHeart,
    Heart,
    HeartHandshake,
    MapPin,
    MessageCircle,
    MoreHorizontal,
    Pencil,
    Phone,
    Send,
    Settings,
    Share2,
    Star,
    Trash2,
    type LucideIcon,
} from 'lucide-react';
import { Post, Comment } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import BusinessOwnerBadge from '@/components/business/BusinessOwnerBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import ReportPostDialog from '@/components/feed/ReportPostDialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { getEventDateParts, EVENT_TIME_ZONE_LABEL } from '@/lib/date-format';
import { getPrimaryImageUrl, shouldUnoptimizeImage } from '@/lib/media';
import { toast } from 'sonner';
import Image from 'next/image';
import { RESCUE_STATUS_LABELS, SIZE_LABELS, SPECIES_LABELS } from '@/lib/foster';
import { cn, countLabel } from '@/lib/utils';
import { RESCUE_NEED_LABELS } from '@/lib/rescue';
import type { RescueNeedType } from '@prisma/client';

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
    canManage?: boolean;
    rescueCase?: {
        id: string;
        status: string;
        species: string;
        size: string;
        urgency: string;
        requestedDays: number;
        primaryNeed: RescueNeedType;
        openNeedTypes?: RescueNeedType[];
        additionalNeeds: Array<{ type: RescueNeedType; status: string }>;
        adoptionListingId: string | null;
    } | null;
    _count?: {
        likes: number;
        comments: number;
    };
}

const POST_TYPE_ICONS: Record<string, LucideIcon> = {
    foster_case: HeartHandshake,
    event: CalendarDays,
    question: CircleHelp,
    recommendation: Star,
};

interface PostCardProps {
    post: ExtendedPost;
    currentUserId?: string;
    currentUserImage?: string | null;
    onLike?: () => void;
    onDelete?: (postId: string) => void;
    onEdit?: (post: ExtendedPost) => void;
}

function PostCard({ post, currentUserId, currentUserImage, onLike, onDelete, onEdit }: PostCardProps) {
    const primaryImageUrl = post.primaryImageUrl || getPrimaryImageUrl(post.images);
    const isFosterCase = post.postType === 'foster_case' && Boolean(post.rescueCase);
    const [isLiked, setIsLiked] = useState(post.isLiked || false);
    const [likeCount, setLikeCount] = useState(post._count?.likes || 0);
    const [deleting, setDeleting] = useState(false);
    const [likePending, setLikePending] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const isAlertPost = post.postType === 'lost_pet' || post.postType === 'found_pet';

    // Event Attendance
    const [isAttending, setIsAttending] = useState(post.isAttending || false);
    const eventEnded = Boolean(post.eventDate && new Date(post.eventDate).getTime() <= Date.now());
    const eventDateParts = post.eventDate ? getEventDateParts(post.eventDate) : null;
    const [isResolved, setIsResolved] = useState(post.isResolved || false);

    // Comments state
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const openNeedTypes = post.rescueCase?.openNeedTypes || [];
    const contactNeed = post.rescueCase && openNeedTypes.includes(post.rescueCase.primaryNeed)
        ? post.rescueCase.primaryNeed
        : openNeedTypes[0];
    const contactLabels: Partial<Record<RescueNeedType, string>> = {
        FOSTER: 'Ofrecer tránsito',
        TRANSPORT: 'Ayudar con el traslado',
        VETERINARY: 'Acompañar al veterinario',
        SUPPLIES: 'Ayudar con insumos',
        FIELD_SUPPORT: 'Apoyar el rescate',
    };

    useEffect(() => {
        setIsResolved(post.isResolved || false);
    }, [post.isResolved]);

    useEffect(() => {
        if (showComments && comments.length === 0) {
            setLoadingComments(true);
            fetch(`/api/posts/${post.id}/comments`)
                .then(async res => {
                    const data = await res.json().catch(() => null);
                    if (!res.ok || !Array.isArray(data?.comments)) {
                        throw new Error(data?.error || 'Error al cargar comentarios');
                    }
                    setComments(data.comments);
                })
                .catch((error: unknown) => {
                    toast.error(error instanceof Error ? error.message : 'Error al cargar comentarios');
                })
                .finally(() => setLoadingComments(false));
        }
    }, [showComments, post.id, comments.length]);

    const handleLike = async () => {
        if (likePending) return;
        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);
        setLikePending(true);

        const revert = (message?: string) => {
            setIsLiked(!newIsLiked);
            setLikeCount(prev => newIsLiked ? prev - 1 : prev + 1);
            toast.error(message || 'No se pudo actualizar el me gusta');
        };

        try {
            const res = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' });
            const data = await res.json().catch(() => null);
            if (res.ok && data?.success) {
                onLike?.();
            } else {
                revert(data?.error);
            }
        } catch {
            revert();
        } finally {
            setLikePending(false);
        }
    };

    const handleShare = async () => {
        const sharePath = isAlertPost
            ? `/alerts?post=${post.id}&type=${isResolved ? 'resolved' : post.postType}`
            : isFosterCase && post.rescueCase
                ? `/hogares-de-transito/casos/${post.rescueCase.id}`
                : '/community';
        const url = `${window.location.origin}${sharePath}`;
        const title = isAlertPost
            ? post.postType === 'found_pet' ? 'Mascota encontrada en Huella' : 'Mascota perdida en Huella'
            : `Publicación de ${post.author?.name || 'la comunidad'} en Huella`;
        const excerpt = post.content.length > 140 ? `${post.content.slice(0, 137)}...` : post.content;

        if (typeof navigator.share === 'function') {
            try {
                await navigator.share({ title, text: excerpt, url });
                return;
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') return;
            }
        }

        try {
            const hasPermalink = sharePath !== '/community';
            await navigator.clipboard.writeText(hasPermalink ? url : `${excerpt}\n\n${url}`);
            toast.success('Enlace copiado');
        } catch {
            toast.error('No pudimos copiar el enlace');
        }
    };

    const handleAttend = async () => {
        if (!post.eventId || (post.eventDate && new Date(post.eventDate).getTime() <= Date.now())) return;

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
        if (!newComment.trim() || submittingComment) return;

        setSubmittingComment(true);
        try {
            const res = await fetch(`/api/posts/${post.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newComment }),
            });
            const data = await res.json().catch(() => null);

            if (res.ok && data?.comment) {
                setComments(prev => [...prev, data.comment]);
                setNewComment('');
            } else {
                toast.error(data?.error || 'No se pudo agregar el comentario');
            }
        } catch {
            toast.error('Error de conexión. Tu comentario sigue en el borrador.');
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Publicación eliminada');
                onDelete?.(post.id);
                return true;
            }
            const data = await res.json().catch(() => null);
            toast.error(data?.error || 'No se pudo eliminar la publicación');
            return false;
        } catch {
            toast.error('No se pudo eliminar la publicación');
            return false;
        } finally {
            setDeleting(false);
        }
    };

    const commentCount = comments.length || post._count?.comments || 0;
    const isLostPet = post.postType === 'lost_pet';
    const typeLabel = post.postType === 'question' ? 'Pregunta' : post.postType === 'recommendation' ? 'Recomendación' : null;
    const TypeIcon = post.postType ? POST_TYPE_ICONS[post.postType] : undefined;

    const toggleResolved = async () => {
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
    };

    return (
        <Card className={cn(
            'min-w-0 gap-0 overflow-hidden py-0',
            deleting && 'opacity-50',
            isLostPet ? (isResolved ? 'border-success/35' : 'border-destructive/35') : isFosterCase && 'border-orange-200',
        )}>
            {isFosterCase && post.rescueCase && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-200 bg-orange-50 px-4 py-2 text-orange-900">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                        <HandHeart className="size-4" aria-hidden="true" />
                        Red solidaria
                    </span>
                    <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold">
                        {RESCUE_STATUS_LABELS[post.rescueCase.status] || post.rescueCase.status}
                    </span>
                </div>
            )}
            {isLostPet && (
                <div className={cn(
                    'flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2',
                    isResolved ? 'border-success/20 bg-success/10 text-green-800' : 'border-destructive/20 bg-destructive/10 text-destructive',
                )}>
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                        {isResolved ? (
                            <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
                        ) : (
                            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                        )}
                        {isResolved ? 'Mascota encontrada' : 'Mascota perdida'}
                    </span>
                    {currentUserId && post.author?.id === currentUserId && (
                        <Button size="sm" variant="outline" className="min-h-9" onClick={() => void toggleResolved()}>
                            {isResolved ? 'Reactivar alerta' : 'Marcar como encontrada'}
                        </Button>
                    )}
                </div>
            )}

            <div className="flex min-w-0 items-center gap-3 px-4 pb-2 pt-3">
                <span className="relative shrink-0">
                    <Avatar className="size-9">
                        <AvatarImage src={post.author?.image || undefined} />
                        <AvatarFallback className="text-sm">{post.author?.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    {post.author?.isBusinessOwner && <BusinessOwnerBadge compact />}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="min-w-0 text-sm [overflow-wrap:anywhere]">
                        <span className="font-semibold text-foreground">{post.author?.name || 'Usuario'}</span>
                        {post.pet && <span className="text-muted-foreground"> con {post.pet.name}</span>}
                    </p>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                        <span suppressHydrationWarning>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: es })}</span>
                        {post.location && (
                            <>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex min-w-0 items-center gap-0.5 [overflow-wrap:anywhere]">
                                    <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                                    {post.location}
                                </span>
                            </>
                        )}
                        {typeLabel && (
                            <>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                    {TypeIcon && <TypeIcon className="size-3.5" aria-hidden="true" />}
                                    {typeLabel}
                                </span>
                            </>
                        )}
                    </div>
                </div>
                {currentUserId && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="-mr-2 text-muted-foreground" aria-label="Más opciones">
                                <MoreHorizontal className="size-5" aria-hidden="true" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {post.author?.id === currentUserId && !isFosterCase && (
                                <>
                                    <DropdownMenuItem onClick={() => onEdit?.(post)}>
                                        <Pencil className="mr-2 size-4 text-muted-foreground" aria-hidden="true" />
                                        Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => setConfirmDeleteOpen(true)} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 size-4" aria-hidden="true" />
                                        Eliminar
                                    </DropdownMenuItem>
                                </>
                            )}
                            {isFosterCase && post.canManage && post.rescueCase && (
                                <DropdownMenuItem asChild>
                                    <Link href={`/hogares-de-transito/casos/${post.rescueCase.id}`}>
                                        <Settings className="mr-2 size-4 text-muted-foreground" aria-hidden="true" />
                                        Gestionar caso
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            {post.author?.id !== currentUserId && post.author?.id && (
                                <DropdownMenuItem
                                    onSelect={() => setReportOpen(true)}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Flag className="mr-2 size-4" aria-hidden="true" />
                                    Reportar
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {isFosterCase && post.rescueCase ? (
                <div className="px-4 pb-4">
                    <p className="text-sm text-muted-foreground">
                        {[
                            SPECIES_LABELS[post.rescueCase.species] || post.rescueCase.species,
                            SIZE_LABELS[post.rescueCase.size] || post.rescueCase.size,
                        ].join(' · ')}
                        {post.rescueCase.urgency !== 'NORMAL' && (
                            <span className="font-semibold text-destructive"> · {post.rescueCase.urgency === 'CRITICAL' ? 'Crítico' : 'Urgente'}</span>
                        )}
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                        Necesidad principal: {RESCUE_NEED_LABELS[post.rescueCase.primaryNeed]}
                    </p>
                    {post.rescueCase.additionalNeeds.length > 0 && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            También necesita {post.rescueCase.additionalNeeds.map((need) => RESCUE_NEED_LABELS[need.type].toLowerCase()).join(', ')}
                        </p>
                    )}
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground [overflow-wrap:anywhere]">{post.content}</p>
                    <Button asChild className="mt-3 w-full sm:w-auto" variant={post.rescueCase.adoptionListingId ? 'default' : 'outline'}>
                        <Link href={post.rescueCase.adoptionListingId
                            ? `/adoptions/${post.rescueCase.adoptionListingId}`
                            : post.canManage || !contactNeed
                                ? `/hogares-de-transito/casos/${post.rescueCase.id}`
                                : `/hogares-de-transito/casos/${post.rescueCase.id}?contact=1&need=${contactNeed}`}>
                            {post.rescueCase.adoptionListingId
                                ? 'Ver adopción'
                                : post.canManage
                                    ? 'Gestionar caso'
                                    : contactNeed
                                        ? contactLabels[contactNeed] || 'Quiero ayudar'
                                        : 'Seguir el caso'}
                        </Link>
                    </Button>
                </div>
            ) : (
                <div className="px-4 pb-3">
                    <p className={cn(
                        'whitespace-pre-wrap leading-relaxed text-foreground [overflow-wrap:anywhere]',
                        post.postType === 'question' ? 'text-base font-semibold' : 'text-sm',
                    )}>
                        {post.content}
                    </p>
                </div>
            )}

            {post.postType === 'event' && eventDateParts && (
                <div className="mx-4 mb-3 flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex w-12 shrink-0 flex-col items-center rounded-md bg-primary-soft py-1.5 text-primary" aria-hidden="true">
                            <span className="text-[11px] font-semibold uppercase leading-none">{eventDateParts.month}</span>
                            <span className="mt-0.5 text-lg font-bold leading-tight">{eventDateParts.day}</span>
                        </div>
                        <div className="min-w-0 text-sm">
                            <p className="font-medium text-foreground" suppressHydrationWarning>
                                {eventEnded ? 'Finalizado' : 'Próximo'} · {eventDateParts.label}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 text-muted-foreground">
                                <Clock className="size-4 shrink-0" aria-hidden="true" />
                                {eventDateParts.time} <span className="text-xs">({EVENT_TIME_ZONE_LABEL})</span>
                            </p>
                            {post.eventLocation && (
                                <p className="mt-0.5 flex min-w-0 items-start gap-1 text-muted-foreground [overflow-wrap:anywhere]">
                                    <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                    {post.eventLocation}
                                </p>
                            )}
                        </div>
                    </div>
                    {post.eventId && (
                        <Button
                            size="sm"
                            variant={isAttending ? 'tonal' : 'outline'}
                            className="w-full shrink-0 sm:w-auto"
                            onClick={handleAttend}
                            disabled={eventEnded}
                            aria-pressed={isAttending}
                        >
                            {eventEnded ? 'Finalizado' : isAttending ? (
                                <>
                                    <Check className="size-4" aria-hidden="true" />
                                    Asistiré
                                </>
                            ) : 'Asistir'}
                        </Button>
                    )}
                </div>
            )}

            {isLostPet && (post.contactPhone || post.lastSeenLocation) && (
                <dl className="mx-4 mb-3 space-y-1 text-sm">
                    {post.lastSeenLocation && (
                        <div className="flex min-w-0 items-start gap-2">
                            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <div className="min-w-0 [overflow-wrap:anywhere]">
                                <dt className="inline font-medium text-foreground">Visto por última vez: </dt>
                                <dd className="inline text-muted-foreground">{post.lastSeenLocation}</dd>
                            </div>
                        </div>
                    )}
                    {post.contactPhone && (
                        <div className="flex min-w-0 items-center gap-2">
                            <Phone className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <dt className="font-medium text-foreground">Contacto:</dt>
                            <dd className="min-w-0">
                                <a href={`tel:${post.contactPhone}`} className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 [overflow-wrap:anywhere] hover:text-primary-hover">
                                    {post.contactPhone}
                                </a>
                            </dd>
                        </div>
                    )}
                </dl>
            )}

            {primaryImageUrl && (
                <div className="relative aspect-[16/10] w-full bg-muted sm:aspect-[2/1]">
                    <Image
                        src={primaryImageUrl}
                        alt="Contenido de la publicación"
                        fill
                        unoptimized={shouldUnoptimizeImage(primaryImageUrl)}
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 680px"
                    />
                </div>
            )}

            {(likeCount > 0 || commentCount > 0) && (
                <div className="flex gap-3 px-4 pt-2.5 text-xs text-muted-foreground">
                    {likeCount > 0 && <span>{likeCount} me gusta</span>}
                    {commentCount > 0 && <span>{countLabel(commentCount, 'comentario', 'comentarios')}</span>}
                </div>
            )}

            <div className="mt-2 flex min-w-0 items-center border-t border-border px-1 py-0.5">
                <Button
                    variant="ghost"
                    className={cn('min-w-0 flex-1 gap-1.5 px-2', isLiked ? 'text-primary hover:text-primary' : 'text-muted-foreground')}
                    onClick={handleLike}
                    aria-label={isLiked ? 'Quitar me gusta' : 'Me gusta'}
                    aria-pressed={isLiked}
                >
                    <Heart className="size-4" fill={isLiked ? 'currentColor' : 'none'} aria-hidden="true" />
                    <span className="text-xs">Me gusta</span>
                </Button>

                <Button
                    variant="ghost"
                    className={cn('min-w-0 flex-1 gap-1.5 px-2', showComments ? 'bg-primary-soft text-primary' : 'text-muted-foreground')}
                    onClick={() => setShowComments(!showComments)}
                    aria-label={showComments ? 'Ocultar comentarios' : post.postType === 'question' ? 'Responder pregunta' : 'Mostrar comentarios'}
                    aria-expanded={showComments}
                >
                    <MessageCircle className="size-4" aria-hidden="true" />
                    <span className="text-xs">{post.postType === 'question' ? 'Responder' : 'Comentar'}</span>
                </Button>

                <Button
                    variant="ghost"
                    className="min-w-0 flex-1 gap-1.5 px-2 text-muted-foreground"
                    aria-label="Compartir"
                    onClick={() => void handleShare()}
                >
                    <Share2 className="size-4" aria-hidden="true" />
                    <span className="text-xs">Compartir</span>
                </Button>
            </div>

            {showComments && (
                <div className="space-y-2 border-t border-border bg-background/60 px-4 py-3">
                    {loadingComments ? (
                        <LoadingSpinner size="sm" className="py-2" />
                    ) : (
                        <div className="space-y-2">
                            {comments.map(comment => (
                                <div key={comment.id} className="flex min-w-0 gap-2 text-sm">
                                    <span className="relative mt-0.5 shrink-0">
                                        <Avatar className="size-7">
                                            <AvatarImage src={comment.author.image || undefined} />
                                            <AvatarFallback className="text-xs">{comment.author.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        {comment.author.isBusinessOwner && <BusinessOwnerBadge compact className="-bottom-1.5 -right-1.5" />}
                                    </span>
                                    <div className="min-w-0 max-w-full rounded-lg border border-border bg-surface px-3 py-1.5 [overflow-wrap:anywhere]">
                                        <span className="mr-1 font-semibold text-foreground">{comment.author.name}</span>
                                        <span className="text-foreground">{comment.content}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex min-w-0 items-center gap-2 pt-1">
                        <Avatar className="size-7 shrink-0">
                            {currentUserImage ? (
                                <AvatarImage src={currentUserImage} />
                            ) : (
                                <AvatarFallback className="bg-primary text-[11px] text-primary-foreground">Yo</AvatarFallback>
                            )}
                        </Avatar>
                        <div className="relative min-w-0 flex-1">
                            <input
                                type="text"
                                aria-label="Escribí un comentario"
                                placeholder="Escribí un comentario"
                                className="min-h-11 w-full rounded-md border border-border-control bg-surface py-2 pl-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
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
                                disabled={!newComment.trim() || submittingComment}
                                aria-label="Enviar comentario"
                                className="absolute right-0.5 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-primary disabled:opacity-50"
                            >
                                <Send className="size-5" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {post.author?.id === currentUserId && !isFosterCase && (
                <ConfirmDialog
                    open={confirmDeleteOpen}
                    onOpenChange={setConfirmDeleteOpen}
                    title="¿Eliminar esta publicación?"
                    description="Se van a borrar también sus comentarios y me gusta. Esta acción no se puede deshacer."
                    confirmLabel="Eliminar"
                    destructive
                    onConfirm={handleDelete}
                />
            )}
            {currentUserId && post.author?.id && post.author.id !== currentUserId && (
                <ReportPostDialog
                    open={reportOpen}
                    onOpenChange={setReportOpen}
                    reportedId={post.author.id}
                    targetId={post.id}
                    targetType={isAlertPost ? 'ALERT' : 'POST'}
                />
            )}
        </Card>
    );
}

export default memo(PostCard);
