'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import LostPetForm from '@/components/community/LostPetForm';
import { getPrimaryImageUrl } from '@/lib/media';
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

export default function AlertsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando alertas...</div>}>
      <AlertsPageContent />
    </Suspense>
  );
}

function AlertsPageContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'lost_pet' | 'found_pet' | 'resolved'>('lost_pet');
  const [alerts, setAlerts] = useState<AlertPost[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'lost' | 'found'>('lost');
  const [sightingPostId, setSightingPostId] = useState<string | null>(null);
  const [sightingNotes, setSightingNotes] = useState('');
  const [sightingLocation, setSightingLocation] = useState('');

  const query = useMemo(() => {
    if (tab === 'resolved') return 'resolved=true';
    return `type=${tab}`;
  }, [tab]);

  const load = async () => {
    const response = await fetch(`/api/posts/lost?${query}&limit=30`);
    const data = await response.json();
    if (data.success) setAlerts(data.lostPets);
  };

  useEffect(() => {
    void load();
  }, [query]);

  useEffect(() => {
    if (searchParams.get('report') === 'lost') {
      setFormMode('lost');
      setFormOpen(true);
    }
  }, [searchParams]);

  const submitSighting = async () => {
    if (!sightingPostId) return;
    const response = await fetch(`/api/posts/${sightingPostId}/sightings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: sightingNotes, location: sightingLocation }),
    });
    const data = await response.json();
    if (data.success) {
      toast.success('Avistamiento registrado');
      setSightingPostId(null);
      setSightingNotes('');
      setSightingLocation('');
      void load();
    } else {
      toast.error(data.error || 'No se pudo registrar');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alertas</h1>
          <p className="text-slate-500">Mascotas perdidas, encontradas y avistamientos.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              setFormMode('found');
              setFormOpen(true);
            }}
          >
            Reportar encontrada
          </Button>
          <Button
            variant="outline"
            className="w-full border-red-200 text-red-700 hover:bg-red-50 sm:w-auto"
            onClick={() => {
              setFormMode('lost');
              setFormOpen(true);
            }}
          >
            Reportar perdida
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <TabsList>
          <TabsTrigger value="lost_pet">Perdidas</TabsTrigger>
          <TabsTrigger value="found_pet">Encontradas</TabsTrigger>
          <TabsTrigger value="resolved">Resueltas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {alerts.length === 0 && (
          <Card className="p-8 text-center text-slate-500">No hay alertas en esta sección.</Card>
        )}
        {alerts.map((alert) => {
          const image = getPrimaryImageUrl(alert.images);
          return (
            <Card key={alert.id}>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row">
                <div className="h-32 w-full overflow-hidden rounded-xl bg-slate-100 sm:w-40">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                      <span className="material-symbols-rounded text-4xl">pets</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={alert.postType === 'found_pet' ? 'bg-teal-100 text-teal-800' : 'bg-red-100 text-red-700'}>
                      {alert.postType === 'found_pet' ? 'Encontrada' : 'Perdida'}
                    </Badge>
                    {alert.isResolved && <Badge className="bg-green-100 text-green-700">Resuelta</Badge>}
                  </div>
                  <p className="font-semibold text-slate-900">{alert.pet?.name || alert.author?.name}</p>
                  <p className="text-sm text-slate-600">{alert.content}</p>
                  {alert.lastSeenLocation && (
                    <p className="text-sm text-slate-500">Zona: {alert.lastSeenLocation}</p>
                  )}
                  <p className="text-xs text-slate-400">
                    {alert._count?.sightings || 0} avistamientos
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setSightingPostId(alert.id)}>
                    Registrar avistamiento
                  </Button>
                  {sightingPostId === alert.id && (
                    <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                      <Input
                        placeholder="Dónde la viste"
                        value={sightingLocation}
                        onChange={(event) => setSightingLocation(event.target.value)}
                      />
                      <Textarea
                        placeholder="Detalles del avistamiento"
                        value={sightingNotes}
                        onChange={(event) => setSightingNotes(event.target.value)}
                      />
                      <Button size="sm" onClick={() => void submitSighting()}>
                        Enviar avistamiento
                      </Button>
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
        onSuccess={() => void load()}
        mode={formMode}
      />
    </div>
  );
}
