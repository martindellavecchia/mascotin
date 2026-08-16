'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface DraftForm {
  name: string;
  breed: string;
  estimatedAge: number;
  gender: 'male' | 'female' | 'unknown';
  energy: 'low' | 'medium' | 'high' | 'unknown';
  character: string;
  bio: string;
  goodWithKids: 'yes' | 'no' | 'unknown';
  goodWithDogs: 'yes' | 'no' | 'unknown';
  goodWithCats: 'yes' | 'no' | 'unknown';
  vaccinated: boolean | null;
  neutered: boolean | null;
  specialNeeds: string;
  requirements: string;
  publicZone: string;
  images: string[];
}

const EMPTY: DraftForm = {
  name: '', breed: '', estimatedAge: 0, gender: 'unknown', energy: 'unknown', character: '', bio: '',
  goodWithKids: 'unknown', goodWithDogs: 'unknown', goodWithCats: 'unknown', vaccinated: null, neutered: null,
  specialNeeds: '', requirements: '', publicZone: '', images: [],
};

function KnownSelect({ value, onChange }: { value: 'yes' | 'no' | 'unknown'; onChange: (value: 'yes' | 'no' | 'unknown') => void }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Sí</SelectItem><SelectItem value="no">No</SelectItem><SelectItem value="unknown">Sin confirmar</SelectItem></SelectContent></Select>;
}

function BooleanSelect({ value, onChange }: { value: boolean | null; onChange: (value: boolean | null) => void }) {
  const selected = value === null ? 'unknown' : value ? 'yes' : 'no';
  return <Select value={selected} onValueChange={(next) => onChange(next === 'unknown' ? null : next === 'yes')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Sí</SelectItem><SelectItem value="no">No</SelectItem><SelectItem value="unknown">Sin confirmar</SelectItem></SelectContent></Select>;
}

export default function FosterAdoptionDraftForm({ caseId }: { caseId: string }) {
  const [form, setForm] = useState<DraftForm>(EMPTY);
  const [canEdit, setCanEdit] = useState(false);
  const [status, setStatus] = useState('DRAFT');
  const [listingId, setListingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/foster/adoption-drafts/${caseId}`);
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo cargar la ficha');
    const draft = data.draft;
    setCanEdit(data.canEdit);
    setStatus(draft.status);
    setListingId(draft.listingId);
    setForm({
      name: draft.name || '', breed: draft.breed || '', estimatedAge: draft.estimatedAge ?? 0,
      gender: draft.gender || 'unknown', energy: draft.energy || 'unknown', character: draft.character || '', bio: draft.bio || '',
      goodWithKids: draft.goodWithKids || 'unknown', goodWithDogs: draft.goodWithDogs || 'unknown', goodWithCats: draft.goodWithCats || 'unknown',
      vaccinated: draft.vaccinated ?? null, neutered: draft.neutered ?? null, specialNeeds: draft.specialNeeds || '',
      requirements: draft.requirements || '', publicZone: draft.publicZone || '', images: draft.images || [],
    });
  }, [caseId]);

  useEffect(() => { load().catch((error) => toast.error(error.message)).finally(() => setLoading(false)); }, [load]);

  const save = async () => {
    const response = await fetch(`/api/foster/adoption-drafts/${caseId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo guardar');
  };

  const handleSave = async (publish: boolean) => {
    setSaving(true);
    try {
      await save();
      if (publish) {
        const response = await fetch(`/api/foster/adoption-drafts/${caseId}/publish`, { method: 'POST' });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo publicar');
        setListingId(data.listingId);
        toast.success('Ficha publicada en Adopciones');
      } else {
        toast.success('Borrador guardado');
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Card><CardContent className="h-40 animate-pulse bg-slate-100" /></Card>;
  if (!canEdit) return <Card><CardHeader><CardTitle className="text-lg">Adopción definitiva</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-slate-600">El hogar de tránsito está preparando la ficha. El cupo continúa ocupado hasta la entrega definitiva.</p>{listingId && <Button asChild><Link href={`/adoptions/${listingId}`}>Ver ficha publicada</Link></Button>}</CardContent></Card>;

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Preparar adopción definitiva</CardTitle><p className="text-sm text-slate-500">Estado: {status}. Los datos desconocidos pueden quedar como “Sin confirmar”.</p></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="adoption-name">Nombre</Label><Input id="adoption-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="adoption-breed">Raza aproximada</Label><Input id="adoption-breed" value={form.breed} onChange={(event) => setForm({ ...form, breed: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="adoption-age">Edad estimada</Label><Input id="adoption-age" type="number" min={0} max={30} value={form.estimatedAge} onChange={(event) => setForm({ ...form, estimatedAge: Number(event.target.value) })} /></div>
          <div className="space-y-2"><Label>Sexo</Label><Select value={form.gender} onValueChange={(gender: DraftForm['gender']) => setForm({ ...form, gender })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="male">Macho</SelectItem><SelectItem value="female">Hembra</SelectItem><SelectItem value="unknown">Sin confirmar</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Energía</Label><Select value={form.energy} onValueChange={(energy: DraftForm['energy']) => setForm({ ...form, energy })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Baja</SelectItem><SelectItem value="medium">Media</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="unknown">Sin confirmar</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="adoption-zone">Zona pública</Label><Input id="adoption-zone" value={form.publicZone} onChange={(event) => setForm({ ...form, publicZone: event.target.value })} /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="adoption-character">Carácter</Label><Textarea id="adoption-character" value={form.character} onChange={(event) => setForm({ ...form, character: event.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="adoption-bio">Historia y cuidados</Label><Textarea id="adoption-bio" rows={5} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2"><Label>Convive con niños</Label><KnownSelect value={form.goodWithKids} onChange={(goodWithKids) => setForm({ ...form, goodWithKids })} /></div>
          <div className="space-y-2"><Label>Convive con perros</Label><KnownSelect value={form.goodWithDogs} onChange={(goodWithDogs) => setForm({ ...form, goodWithDogs })} /></div>
          <div className="space-y-2"><Label>Convive con gatos</Label><KnownSelect value={form.goodWithCats} onChange={(goodWithCats) => setForm({ ...form, goodWithCats })} /></div>
          <div className="space-y-2"><Label>Vacunas</Label><BooleanSelect value={form.vaccinated} onChange={(vaccinated) => setForm({ ...form, vaccinated })} /></div>
          <div className="space-y-2"><Label>Castración</Label><BooleanSelect value={form.neutered} onChange={(neutered) => setForm({ ...form, neutered })} /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="adoption-needs">Necesidades especiales</Label><Textarea id="adoption-needs" value={form.specialNeeds} onChange={(event) => setForm({ ...form, specialNeeds: event.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="adoption-requirements">Requisitos del hogar definitivo</Label><Textarea id="adoption-requirements" value={form.requirements} onChange={(event) => setForm({ ...form, requirements: event.target.value })} /></div>
        <div className="flex flex-col gap-2 sm:flex-row"><Button variant="outline" disabled={saving} onClick={() => void handleSave(false)}>Guardar borrador</Button><Button disabled={saving} onClick={() => void handleSave(true)}>{listingId ? 'Actualizar publicación' : 'Publicar en Adopciones'}</Button>{listingId && <Button asChild variant="ghost"><Link href={`/adoptions/${listingId}`}>Ver ficha</Link></Button>}</div>
      </CardContent>
    </Card>
  );
}
