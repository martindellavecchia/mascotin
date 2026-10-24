'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, PawPrint } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import LostPetForm from '@/components/community/LostPetForm';
import { getPrimaryImageUrl } from '@/lib/media';
import { cn, countLabel } from '@/lib/utils';
import { toast } from 'sonner';

interface AlertPost {
  id: string;
  content: string;
  postType: string;
  lastSeenLocation: string | null;
  contactPhone: string | null;
  isResolved: boolean;
  createdAt: string;
  images: string;
  author?: { id: string; name: string | null };
  pet?: { name: string; petType: string } | null;
  _count?: { sightings: number };
}

type AlertTab = 'lost_pet' | 'found_pet' | 'resolved';

const ALERT_TABS: AlertTab[] = ['lost_pet', 'found_pet', 'resolved'];

function parseTab(value: string | null): AlertTab | null {
  return ALERT_TABS.includes(value as AlertTab) ? (value as AlertTab) : null;
}

export default function AlertsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Cargando alertas...</div>}>
      <AlertsPageContent />
    </Suspense>
  );
}

function AlertsPageContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const reportParam = searchParams.get('report');
  const selectedPostId = searchParams.get('post');
  const deepLinkedTab = parseTab(searchParams.get('type'));
  const initialPetId = searchParams.get('petId') || undefined;
  const [tab, setTab] = useState<AlertTab>(deepLinkedTab || 'lost_pet');
  const [alerts, setAlerts] = useState<AlertPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'lost' | 'found'>('lost');
  const [sightingPostId, setSightingPostId] = useState<string | null>(null);
  const [sightingNotes, setSightingNotes] = useState('');
  const [sightingLocation, setSightingLocation] = useState('');
  const [submittingSighting, setSubmittingSighting] = useState(false);
  const [resolvingPostId, setResolvingPostId] = useState<string | null>(null);
  const [hideResolved, setHideResolved] = useState(false);

  const showResolvedTab = !hideResolved || deepLinkedTab === 'resolved';

  const query = useMemo(() => {
    if (tab === 'resolved') return 'resolved=true';
    return `type=${tab}`;
  }, [tab]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch(`/api/posts/lost?${query}&limit=30`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'No se pudieron cargar las alertas');
      setAlerts(data.lostPets);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!currentUserId) return;
    const controller = new AbortController();
    fetch('/api/settings', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.success) setHideResolved(Boolean(data.settings?.hideResolvedLostPets));
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Error fetching alert preferences:', error);
      });
    return () => controller.abort();
  }, [currentUserId]);

  useEffect(() => {
    if (!showResolvedTab && tab === 'resolved') setTab('lost_pet');
  }, [showResolvedTab, tab]);

  useEffect(() => {
    if (reportParam === 'lost' || reportParam === 'found') {
      setFormMode(reportParam);
      setFormOpen(true);
    }
  }, [reportParam]);

  useEffect(() => {
    if (loading || !selectedPostId) return;
    window.requestAnimationFrame(() => {
      document.getElementById(`alert-${selectedPostId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [alerts, loading, selectedPostId]);

  const openForm = (mode: 'lost' | 'found') => {
    setFormMode(mode);
    setFormOpen(true);
  };

  const submitSighting = async () => {
    if (!sightingPostId || submittingSighting) return;
    setSubmittingSighting(true);
    try {
      const response = await fetch(`/api/posts/${sightingPostId}/sightings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: sightingNotes, location: sightingLocation }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) {
        toast.success('Avistamiento registrado');
        setSightingPostId(null);
        setSightingNotes('');
        setSightingLocation('');
        void load();
      } else {
        toast.error(data?.error || 'No se pudo registrar el avistamiento');
      }
    } catch {
      toast.error('Error de conexión. Intentá de nuevo.');
    } finally {
      setSubmittingSighting(false);
    }
  };

  const toggleResolved = async (alert: AlertPost) => {
    if (resolvingPostId) return;
    const targetResolved = !alert.isResolved;
    setResolvingPostId(alert.id);
    try {
      const response = await fetch(`/api/posts/${alert.id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isResolved: targetResolved }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        toast.error(data?.error || 'No se pudo actualizar la alerta');
        return;
      }
      const isResolved = typeof data.post?.isResolved === 'boolean' ? data.post.isResolved : targetResolved;
      toast.success(data.message || (isResolved ? 'Alerta marcada como resuelta' : 'Alerta reactivada'));
      setAlerts((current) => {
        if (isResolved && hideResolved) return current.filter((item) => item.id !== alert.id);
        return current.map((item) => (item.id === alert.id ? { ...item, isResolved } : item));
      });
    } catch {
      toast.error('Error de conexión. Intentá de nuevo.');
    } finally {
      setResolvingPostId(null);
    }
  };

  const visibleAlerts = hideResolved && tab !== 'resolved'
    ? alerts.filter((alert) => !alert.isResolved)
    : alerts;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <PageHeader
        title="Alertas"
        description="Mascotas perdidas, encontradas y avistamientos de la comunidad."
        action={<div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => openForm('found')}
          >
            Encontré una mascota
          </Button>
          <Button
            variant="outline"
            className="border-destructive/35 text-destructive hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive"
            onClick={() => openForm('lost')}
          >
            Reportar perdida
          </Button>
        </div>}
      />

      <p className="text-sm text-muted-foreground">
        ¿El animal que encontraste necesita tránsito, traslado o atención veterinaria?{' '}
        <Link
          href="/hogares-de-transito?create=case"
          className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Pedí ayuda a la red solidaria
        </Link>
      </p>

      <Tabs value={tab} onValueChange={(value) => setTab(value as AlertTab)} className="min-w-0">
        <TabsList className={cn('grid h-auto w-full', showResolvedTab ? 'grid-cols-3' : 'grid-cols-2')}>
          <TabsTrigger className="min-h-10 px-2" value="lost_pet">Perdidas</TabsTrigger>
          <TabsTrigger className="min-h-10 px-2" value="found_pet">Encontradas</TabsTrigger>
          {showResolvedTab && <TabsTrigger className="min-h-10 px-2" value="resolved">Resueltas</TabsTrigger>}
        </TabsList>
      </Tabs>

      <div className="space-y-4" aria-live="polite">
        {loading && [0, 1].map((item) => (
          <Card key={item} className="gap-0 py-0 overflow-hidden" aria-label="Cargando alerta">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row">
              <div className="h-32 w-full animate-pulse rounded-xl bg-muted sm:w-40" />
              <div className="flex-1 space-y-3 py-1">
                <div className="h-5 w-24 animate-pulse rounded bg-muted" />
                <div className="h-5 w-2/5 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && loadError && (
          <EmptyState
            title="No pudimos cargar las alertas"
            description="Intentá nuevamente en unos segundos."
            action={<Button variant="outline" onClick={() => void load()}>Reintentar</Button>}
          />
        )}
        {!loading && !loadError && visibleAlerts.length === 0 && (
          <EmptyState title="No hay alertas en esta sección" />
        )}
        {!loading && !loadError && visibleAlerts.map((alert) => {
          const image = getPrimaryImageUrl(alert.images);
          const isSelected = selectedPostId === alert.id;
          const isOwner = Boolean(currentUserId && alert.author?.id === currentUserId);
          const isResolving = resolvingPostId === alert.id;
          return (
            <Card
              id={`alert-${alert.id}`}
              key={alert.id}
              className={cn('gap-0 py-0', isSelected && 'border-primary/40 ring-2 ring-primary/15')}
            >
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                {image ? (
                  <div className="h-44 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:h-32 sm:w-40">
                    <img src={image} alt={alert.pet?.name || 'Mascota reportada'} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="hidden size-16 shrink-0 items-center justify-center rounded-lg bg-primary-soft sm:flex">
                    <PawPrint className="size-7 text-primary/30" aria-hidden="true" />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={alert.postType === 'found_pet' ? 'default' : 'destructive'}>
                      {alert.postType === 'found_pet' ? 'Encontrada' : 'Perdida'}
                    </Badge>
                    {alert.isResolved && <Badge variant="success">Resuelta</Badge>}
                    <span className="text-xs text-muted-foreground">Publicada por {alert.author?.name || 'la comunidad'}</span>
                  </div>
                  {alert.pet?.name && <p className="font-semibold text-foreground">{alert.pet.name}</p>}
                  <p className="break-words text-sm text-foreground [overflow-wrap:anywhere]">{alert.content}</p>
                  {alert.lastSeenLocation && (
                    <p className="text-sm text-muted-foreground">Zona: {alert.lastSeenLocation}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {countLabel(alert._count?.sightings || 0, 'avistamiento', 'avistamientos')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {isOwner && (
                      <Button
                        size="sm"
                        variant={alert.isResolved ? 'outline' : 'default'}
                        disabled={isResolving}
                        onClick={() => void toggleResolved(alert)}
                      >
                        {isResolving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                        {alert.isResolved
                          ? 'Reactivar alerta'
                          : alert.postType === 'found_pet' ? 'Marcar como resuelta' : 'Marcar como encontrada'}
                      </Button>
                    )}
                    {!alert.isResolved && (
                      <Button variant="outline" size="sm" onClick={() => setSightingPostId(alert.id)}>
                        Registrar avistamiento
                      </Button>
                    )}
                  </div>
                  {sightingPostId === alert.id && (
                    <div className="space-y-2 border-t border-border pt-3">
                      <div className="space-y-1">
                        <Label htmlFor={`sighting-location-${alert.id}`}>Dónde la viste</Label>
                        <Input
                          id={`sighting-location-${alert.id}`}
                          placeholder="Ej: Plaza Italia, Palermo"
                          value={sightingLocation}
                          onChange={(event) => setSightingLocation(event.target.value)}
                          disabled={submittingSighting}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`sighting-notes-${alert.id}`}>Detalles del avistamiento</Label>
                        <Textarea
                          id={`sighting-notes-${alert.id}`}
                          value={sightingNotes}
                          onChange={(event) => setSightingNotes(event.target.value)}
                          disabled={submittingSighting}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => void submitSighting()} disabled={submittingSighting}>
                          {submittingSighting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                          {submittingSighting ? 'Enviando…' : 'Enviar avistamiento'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSightingPostId(null)}
                          disabled={submittingSighting}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <LostPetForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => {
          const nextTab: AlertTab = formMode === 'found' ? 'found_pet' : 'lost_pet';
          if (nextTab === tab) void load();
          else setTab(nextTab);
        }}
        mode={formMode}
        initialPetId={initialPetId}
      />
    </div>
  );
}
