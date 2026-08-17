'use client';

import { useState } from 'react';
import LocationField from '@/components/help/LocationField';
import type { VolunteerProfileView } from '@/components/help/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type VolunteerRoleValue = VolunteerProfileView['roles'][number];
const ROLES: Array<{ value: VolunteerRoleValue; label: string }> = [
  { value: 'TRANSPORT', label: 'Traslados' },
  { value: 'VET_COMPANION', label: 'Acompañamiento veterinario' },
  { value: 'FIELD_SUPPORT', label: 'Apoyo en rescates' },
  { value: 'SUPPLIES_LOGISTICS', label: 'Logística de insumos' },
];

function dateValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

export default function VolunteerProfileForm({ profile, onSaved }: {
  profile: VolunteerProfileView | null;
  onSaved: (profile: VolunteerProfileView) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    roles: profile?.roles || ['TRANSPORT'] as VolunteerRoleValue[],
    location: profile?.location || '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    radiusKm: profile?.radiusKm || 5,
    availableFrom: dateValue(profile?.availableFrom),
    availableUntil: dateValue(profile?.availableUntil),
    maxConcurrentTasks: profile?.maxConcurrentTasks || 1,
    notes: profile?.notes || '',
    adultDeclared: Boolean(profile),
    termsAccepted: Boolean(profile),
  });

  const toggleRole = (role: VolunteerRoleValue) => setForm((current) => ({
    ...current,
    roles: current.roles.includes(role) ? current.roles.filter((item) => item !== role) : [...current.roles, role],
  }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/volunteer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo guardar el perfil');
      toast.success(profile ? 'Perfil de voluntariado actualizado' : 'Tu perfil de voluntariado ya está activo');
      onSaved(data.profile);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Ayudar como voluntario</h2>
        <p className="mt-1 text-sm text-slate-500">Este perfil es independiente de ofrecer un hogar. Podés tener ambos.</p>
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-800">Tareas que podés realizar</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ROLES.map((role) => (
            <label key={role.value} className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 px-3">
              <Checkbox checked={form.roles.includes(role.value)} onCheckedChange={() => toggleRole(role.value)} />
              <span className="text-sm text-slate-700">{role.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <LocationField
        location={form.location}
        latitude={form.latitude}
        longitude={form.longitude}
        onLocationChange={(location) => setForm((current) => ({ ...current, location }))}
        onCoordinatesChange={(latitude, longitude) => setForm((current) => ({ ...current, latitude, longitude }))}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="volunteer-radius">Radio</Label>
          <div className="relative"><Input id="volunteer-radius" type="number" min={1} max={50} value={form.radiusKm} onChange={(event) => setForm((current) => ({ ...current, radiusKm: Math.min(50, Math.max(1, Number(event.target.value) || 1)) }))} className="pr-10" /><span className="pointer-events-none absolute right-3 top-2.5 text-sm text-slate-400">km</span></div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="volunteer-capacity">Tareas simultáneas</Label>
          <Input id="volunteer-capacity" type="number" min={1} max={5} value={form.maxConcurrentTasks} onChange={(event) => setForm((current) => ({ ...current, maxConcurrentTasks: Number(event.target.value) }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="volunteer-from">Disponible desde</Label>
          <Input id="volunteer-from" type="date" value={form.availableFrom} onChange={(event) => setForm((current) => ({ ...current, availableFrom: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="volunteer-until">Disponible hasta</Label>
          <Input id="volunteer-until" type="date" value={form.availableUntil} onChange={(event) => setForm((current) => ({ ...current, availableUntil: event.target.value }))} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="volunteer-notes">Notas o restricciones</Label>
        <Textarea id="volunteer-notes" rows={4} maxLength={1000} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Ej. tengo auto disponible los fines de semana" />
      </div>
      <div className="space-y-3 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950">
        <p className="font-semibold">Condiciones de voluntariado</p>
        <p>Aceptás únicamente la tarea coordinada. No asumís gastos, diagnósticos ni decisiones veterinarias, y no hay aprobación administrativa previa.</p>
        <label className="flex items-start gap-3"><Checkbox checked={form.adultDeclared} onCheckedChange={(checked) => setForm((current) => ({ ...current, adultDeclared: checked === true }))} /><span>Declaro que soy mayor de 18 años.</span></label>
        <label className="flex items-start gap-3"><Checkbox checked={form.termsAccepted} onCheckedChange={(checked) => setForm((current) => ({ ...current, termsAccepted: checked === true }))} /><span>Acepto estas condiciones y el uso privado de mi ubicación para encontrar tareas cercanas.</span></label>
      </div>
      <Button type="submit" disabled={saving} className="w-full sm:w-auto">{saving ? 'Guardando…' : profile ? 'Guardar cambios' : 'Activar voluntariado'}</Button>
    </form>
  );
}
