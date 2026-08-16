'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import LocationField from '@/components/help/LocationField';
import type { FosterProfileView } from '@/components/help/types';
import { FOSTER_TERMS_VERSION } from '@/lib/foster';
import { toast } from 'sonner';

interface FosterProfileFormProps {
  profile: FosterProfileView | null;
  onSaved: (profile: FosterProfileView) => void;
}
function dateValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

export default function FosterProfileForm({ profile, onSaved }: FosterProfileFormProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    acceptsSpecies: profile?.acceptsSpecies || ['dog'],
    acceptsSizes: profile?.acceptsSizes || ['small', 'medium'],
    capacity: profile?.capacity || 1,
    location: profile?.location || '',
    latitude: profile?.latitude,
    longitude: profile?.longitude,
    availableFrom: dateValue(profile?.availableFrom),
    availableUntil: dateValue(profile?.availableUntil),
    maxDurationDays: profile?.maxDurationDays || 30,
    housingType: profile?.housingType || 'apartment',
    hasYard: profile?.hasYard || false,
    hasKids: profile?.hasKids || false,
    hasOtherPets: profile?.hasOtherPets || false,
    experience: profile?.experience || 'some',
    notes: profile?.notes || '',
    adultDeclared: Boolean(profile),
    termsAccepted: profile?.termsVersion === FOSTER_TERMS_VERSION,
  });

  const toggleList = (key: 'acceptsSpecies' | 'acceptsSizes', value: string) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/foster/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        toast.error(data.error || 'No se pudo guardar el perfil');
        return;
      }
      toast.success(profile ? 'Perfil de tránsito actualizado' : 'Tu hogar ya puede recibir solicitudes');
      onSaved(data.profile as FosterProfileView);
    } catch {
      toast.error('No se pudo guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Tu hogar de tránsito</h2>
        <p className="mt-1 text-sm text-slate-500">Definí qué animales podés recibir y cuándo estás disponible.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-800">Animales que aceptás</legend>
          {[
            ['dog', 'Perros'],
            ['cat', 'Gatos'],
            ['other', 'Otros animales'],
          ].map(([value, label]) => (
            <label key={value} className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 px-3">
              <Checkbox
                checked={form.acceptsSpecies.includes(value)}
                onCheckedChange={() => toggleList('acceptsSpecies', value)}
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-800">Tamaños que aceptás</legend>
          {[
            ['small', 'Pequeño'],
            ['medium', 'Mediano'],
            ['large', 'Grande'],
            ['any', 'Cualquier tamaño'],
          ].map(([value, label]) => (
            <label key={value} className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 px-3">
              <Checkbox
                checked={form.acceptsSizes.includes(value)}
                onCheckedChange={() => toggleList('acceptsSizes', value)}
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <LocationField
        location={form.location}
        latitude={form.latitude}
        longitude={form.longitude}
        onLocationChange={(location) => setForm((current) => ({ ...current, location }))}
        onCoordinatesChange={(latitude, longitude) => setForm((current) => ({ ...current, latitude, longitude }))}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="foster-capacity">Capacidad máxima</Label>
          <Input
            id="foster-capacity"
            type="number"
            min={1}
            max={5}
            value={form.capacity}
            onChange={(event) => setForm((current) => ({ ...current, capacity: Number(event.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="foster-duration">Duración máxima</Label>
          <div className="relative">
            <Input
              id="foster-duration"
              type="number"
              min={1}
              max={90}
              value={form.maxDurationDays}
              onChange={(event) => setForm((current) => ({ ...current, maxDurationDays: Number(event.target.value) }))}
              className="pr-14"
            />
            <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-slate-400">días</span>
          </div>
        </div>
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <Label>Tipo de vivienda</Label>
          <Select value={form.housingType} onValueChange={(housingType) => setForm((current) => ({ ...current, housingType }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="apartment">Departamento</SelectItem>
              <SelectItem value="house">Casa</SelectItem>
              <SelectItem value="other">Otra</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="available-from">Disponible desde</Label>
          <Input id="available-from" type="date" value={form.availableFrom} onChange={(event) => setForm((current) => ({ ...current, availableFrom: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="available-until">Disponible hasta</Label>
          <Input id="available-until" type="date" value={form.availableUntil} onChange={(event) => setForm((current) => ({ ...current, availableUntil: event.target.value }))} />
        </div>
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <Label>Experiencia</Label>
          <Select value={form.experience} onValueChange={(experience) => setForm((current) => ({ ...current, experience }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Primera vez</SelectItem>
              <SelectItem value="some">Algo de experiencia</SelectItem>
              <SelectItem value="experienced">Mucha experiencia</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['hasYard', 'Tengo patio'],
          ['hasKids', 'Viven niños'],
          ['hasOtherPets', 'Hay otras mascotas'],
        ].map(([key, label]) => (
          <label key={key} className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 px-3">
            <Checkbox
              checked={form[key as 'hasYard' | 'hasKids' | 'hasOtherPets']}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, [key]: checked === true }))}
            />
            <span className="text-sm text-slate-700">{label}</span>
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="foster-notes">Restricciones o información importante</Label>
        <Textarea
          id="foster-notes"
          rows={4}
          maxLength={1000}
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          placeholder="Ej. no puedo recibir animales que necesiten subir escaleras"
        />
      </div>

      <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Términos del hogar de tránsito</p>
        <p>
          El hogar participa de forma voluntaria. Desde que ambas partes confirman la entrega y hasta el cierre del tránsito,
          asume los gastos cotidianos y las decisiones y gastos veterinarios del animal.
        </p>
        <p>MascoTin facilita el contacto y no realiza verificación adicional de los hogares.</p>
        <label className="flex items-start gap-3">
          <Checkbox
            checked={form.adultDeclared}
            onCheckedChange={(checked) => setForm((current) => ({ ...current, adultDeclared: checked === true }))}
          />
          <span>Declaro que soy mayor de 18 años.</span>
        </label>
        <label className="flex items-start gap-3">
          <Checkbox
            checked={form.termsAccepted}
            onCheckedChange={(checked) => setForm((current) => ({ ...current, termsAccepted: checked === true }))}
          />
          <span>Acepto estas condiciones y el uso privado de mi ubicación para encontrar casos cercanos.</span>
        </label>
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
        {saving ? 'Guardando…' : profile ? 'Guardar cambios' : 'Activar mi hogar'}
      </Button>
    </form>
  );
}
