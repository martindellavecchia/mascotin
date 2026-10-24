'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import VolunteerProfileForm from '@/components/help/VolunteerProfileForm';
import type { VolunteerProfileView } from '@/components/help/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RESCUE_NEED_LABELS } from '@/lib/rescue';
import { VOLUNTEER_ROLE_LABELS } from '@/lib/volunteer';
import { toast } from 'sonner';

interface VolunteerOfferView {
  id: string;
  status: string;
  role: keyof typeof VOLUNTEER_ROLE_LABELS;
  distanceKm: number;
  score: number;
  reasons: string[];
  expiresAt: string;
  assignment: { id: string; status: string } | null;
  need: { id: string; type: keyof typeof RESCUE_NEED_LABELS; details: string | null; status: string };
  rescueCase: { id: string; species: string; size: string; urgency: string; location: string; images: string[]; status: string };
}

interface VolunteerAssignmentView {
  id: string;
  status: string;
  isRequester: boolean;
  volunteer: { id: string; name: string | null; image: string | null };
  need: { id: string; type: keyof typeof RESCUE_NEED_LABELS; details: string | null; status: string };
  rescueCase: { id: string; species: string; size: string; urgency: string; location: string; images: string[] };
}

export default function VolunteerPanel({ returnTo, initialProfileOpen = false }: { returnTo?: string | null; initialProfileOpen?: boolean }) {
  const router = useRouter();
  const [profile, setProfile] = useState<VolunteerProfileView | null>(null);
  const [offers, setOffers] = useState<VolunteerOfferView[]>([]);
  const [assignments, setAssignments] = useState<VolunteerAssignmentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(initialProfileOpen);
  const [cancelReasons, setCancelReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileResponse, offersResponse, assignmentsResponse] = await Promise.all([
        fetch('/api/volunteer/profile'),
        fetch('/api/volunteer/offers'),
        fetch('/api/volunteer/assignments'),
      ]);
      const [profileData, offersData, assignmentsData] = await Promise.all([
        profileResponse.json(), offersResponse.json(), assignmentsResponse.json(),
      ]);
      if (profileData.success) setProfile(profileData.profile);
      if (offersData.success) setOffers(offersData.offers || []);
      if (assignmentsData.success) setAssignments(assignmentsData.assignments || []);
    } catch {
      toast.error('No pudimos cargar el voluntariado');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const mutate = async (url: string, options: RequestInit, success: string) => {
    setActing(true);
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo completar la acción');
      toast.success(success);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo completar la acción');
    } finally {
      setActing(false);
    }
  };

  if (loading) return <div className="h-48 animate-pulse rounded-2xl bg-muted" />;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div><CardTitle>Mi voluntariado</CardTitle><p className="mt-1 text-sm text-muted-foreground">Traslados, acompañamiento, rescate y logística; separado del hogar de tránsito.</p></div>
          {profile && <Badge className={profile.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-slate-700'}>{profile.status === 'ACTIVE' ? 'Disponible' : profile.status === 'PAUSED' ? 'Pausado' : 'Suspendido'}</Badge>}
        </CardHeader>
        <CardContent className="space-y-4">
          {profile ? (
            <>
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-xl bg-background p-4"><p className="text-muted-foreground">Zona y radio</p><p className="mt-1 font-medium text-foreground">{profile.location} · {profile.radiusKm} km</p></div>
                <div className="rounded-xl bg-background p-4"><p className="text-muted-foreground">Cupo</p><p className="mt-1 font-medium text-foreground">{profile.occupiedTasks}/{profile.maxConcurrentTasks} tareas activas</p></div>
                <div className="rounded-xl bg-background p-4"><p className="text-muted-foreground">Roles</p><p className="mt-1 font-medium text-foreground">{profile.roles.map((role) => VOLUNTEER_ROLE_LABELS[role]).join(', ')}</p></div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => setDialogOpen(true)}>Editar perfil</Button>
                {profile.status !== 'SUSPENDED' && <Button variant="outline" onClick={() => void mutate('/api/volunteer/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: profile.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }) }, profile.status === 'ACTIVE' ? 'Voluntariado pausado' : 'Voluntariado activo')}>{profile.status === 'ACTIVE' ? 'Pausar tareas nuevas' : 'Volver a activar'}</Button>}
              </div>
            </>
          ) : (
            <div className="py-8 text-center"><p className="text-slate-600">Todavía no configuraste tu perfil de voluntariado.</p><Button className="mt-4" onClick={() => setDialogOpen(true)}>Ayudar como voluntario</Button></div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div><h3 className="text-lg font-bold text-foreground">Ofertas cercanas</h3><p className="text-sm text-muted-foreground">Vencen a las 24 horas. Mostrar interés no te asigna la tarea.</p></div>
        {offers.length === 0 ? <Card className="gap-0 py-0 border-dashed"><CardContent className="py-8 text-center text-sm text-muted-foreground">No hay tareas compatibles por ahora.</CardContent></Card> : (
          <div className="grid gap-4 md:grid-cols-2">
            {offers.map((offer) => (
              <Card key={offer.id} className="gap-0 py-0"><CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-foreground">{RESCUE_NEED_LABELS[offer.need.type]}</p><p className="text-sm text-muted-foreground">{offer.rescueCase.location} · {offer.distanceKm.toFixed(1)} km</p></div><Badge variant="outline">{offer.score}%</Badge></div>
                <p className="text-sm text-slate-600">{VOLUNTEER_ROLE_LABELS[offer.role]}{offer.need.details ? ` · ${offer.need.details}` : ''}</p>
                {offer.status === 'PENDING' ? <div className="grid grid-cols-2 gap-2"><Button disabled={acting} onClick={() => void mutate(`/api/volunteer/offers/${offer.id}/respond`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response: 'INTERESTED' }) }, 'Avisamos que podés ayudar')}>Me interesa</Button><Button variant="outline" disabled={acting} onClick={() => void mutate(`/api/volunteer/offers/${offer.id}/respond`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response: 'DECLINED' }) }, 'Respuesta guardada')}>Esta vez no</Button></div> : <Button asChild variant="outline" className="w-full"><Link href={`/hogares-de-transito/casos/${offer.rescueCase.id}`}>{offer.assignment ? 'Abrir tarea' : 'Ver caso'}</Link></Button>}
              </CardContent></Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div><h3 className="text-lg font-bold text-foreground">Tareas coordinadas</h3><p className="text-sm text-muted-foreground">El chat privado está disponible mientras la tarea permanece activa.</p></div>
        {assignments.length === 0 ? <Card className="gap-0 py-0 border-dashed"><CardContent className="py-8 text-center text-sm text-muted-foreground">Todavía no tenés tareas coordinadas.</CardContent></Card> : assignments.map((assignment) => (
          <Card key={assignment.id} className="gap-0 py-0"><CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-foreground">{RESCUE_NEED_LABELS[assignment.need.type]}</p><p className="text-sm text-muted-foreground">{assignment.rescueCase.location}</p></div><Badge className={assignment.status === 'ACTIVE' ? 'bg-teal-100 text-primary' : 'bg-muted text-slate-700'}>{assignment.status === 'ACTIVE' ? 'Activa' : assignment.status === 'COMPLETED' ? 'Completada' : 'Cancelada'}</Badge></div>
            <Button asChild variant="outline"><Link href={`/hogares-de-transito/casos/${assignment.rescueCase.id}`}>Abrir caso y chat</Link></Button>
            {assignment.status === 'ACTIVE' && <div className="space-y-3 rounded-xl border border-border p-3">
              {assignment.isRequester && <Button disabled={acting} onClick={() => void mutate(`/api/volunteer/assignments/${assignment.id}/complete`, { method: 'POST' }, 'Tarea completada')}>Marcar tarea completada</Button>}
              <div className="space-y-2"><Label htmlFor={`cancel-${assignment.id}`}>Motivo si necesitás cancelar</Label><div className="flex flex-col gap-2 sm:flex-row"><Input id={`cancel-${assignment.id}`} value={cancelReasons[assignment.id] || ''} onChange={(event) => setCancelReasons((current) => ({ ...current, [assignment.id]: event.target.value }))} placeholder="Ej. cambió mi disponibilidad" /><Button variant="outline" disabled={acting || (cancelReasons[assignment.id] || '').trim().length < 3} onClick={() => void mutate(`/api/volunteer/assignments/${assignment.id}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: cancelReasons[assignment.id] }) }, 'Tarea cancelada y búsqueda reabierta')}>Cancelar tarea</Button></div></div>
            </div>}
          </CardContent></Card>
        ))}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92svh] max-w-3xl overflow-y-auto"><DialogHeader className="sr-only"><DialogTitle>Perfil de voluntariado</DialogTitle><DialogDescription>Disponibilidad para tareas solidarias</DialogDescription></DialogHeader><VolunteerProfileForm profile={profile} onSaved={(saved) => { setProfile(saved); setDialogOpen(false); if (returnTo) router.push(returnTo); else void load(); }} /></DialogContent>
      </Dialog>
    </div>
  );
}
