'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import HelpImageUpload from '@/components/help/HelpImageUpload';
import LocationField from '@/components/help/LocationField';
import { DEFAULT_FOSTER_RADIUS_KM } from '@/lib/foster';
import { RESCUE_NEED_LABELS } from '@/lib/rescue';
import { toast } from 'sonner';

type NeedType = 'FOSTER' | 'VETERINARY' | 'TRANSPORT' | 'SUPPLIES' | 'FIELD_SUPPORT';
const NEED_TYPES: NeedType[] = ['FOSTER', 'VETERINARY', 'TRANSPORT', 'SUPPLIES', 'FIELD_SUPPORT'];

interface RescueCaseFormProps {
  onCreated: (caseId: string) => void;
}
export default function RescueCaseForm({ onCreated }: RescueCaseFormProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    species: 'dog',
    size: 'medium',
    urgency: 'NORMAL',
    apparentCondition: '',
    description: '',
    images: [] as string[],
    location: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    searchRadiusKm: DEFAULT_FOSTER_RADIUS_KM,
    requestedDays: 14,
    primaryNeed: 'FOSTER' as NeedType,
    additionalNeeds: [] as NeedType[],
    needDetails: {} as Partial<Record<NeedType, string>>,
    consentAccepted: false,
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/rescue-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        toast.error(data.error || 'No se pudo crear el caso');
        return;
      }
      const matches = Number(data.offerCount || 0) + Number(data.volunteerOfferCount || 0);
      toast.success(matches > 0 ? `Caso creado y enviado a ${matches} personas cercanas` : 'Caso creado. La red seguirá buscando ayuda compatible.');
      onCreated(data.case.id as string);
    } catch {
      toast.error('No se pudo crear el caso');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Encontré una mascota</h2>
        <p className="mt-1 text-sm text-slate-500">Creá una solicitud para buscar un hogar temporal cercano.</p>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Si el animal está en riesgo vital, priorizá la atención veterinaria inmediata. Esta búsqueda no reemplaza una emergencia.
      </div>

      <HelpImageUpload images={form.images} onChange={(images) => setForm((current) => ({ ...current, images }))} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Especie</Label>
          <Select value={form.species} onValueChange={(species) => setForm((current) => ({ ...current, species }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="dog">Perro</SelectItem>
              <SelectItem value="cat">Gato</SelectItem>
              <SelectItem value="other">Otro animal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tamaño estimado</Label>
          <Select value={form.size} onValueChange={(size) => setForm((current) => ({ ...current, size }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Pequeño</SelectItem>
              <SelectItem value="medium">Mediano</SelectItem>
              <SelectItem value="large">Grande</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Urgencia</Label>
          <Select value={form.urgency} onValueChange={(urgency) => setForm((current) => ({ ...current, urgency }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NORMAL">Necesita resguardo</SelectItem>
              <SelectItem value="HIGH">Necesita atención pronto</SelectItem>
              <SelectItem value="CRITICAL">Situación crítica</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <fieldset className="space-y-4 rounded-xl border border-teal-100 bg-teal-50/40 p-4">
        <div>
          <legend className="font-semibold text-slate-900">¿Qué ayuda necesita?</legend>
          <p className="mt-1 text-sm text-slate-600">Elegí una necesidad principal y hasta cuatro complementarias.</p>
        </div>
        <div className="space-y-2">
          <Label>Necesidad principal</Label>
          <Select value={form.primaryNeed} onValueChange={(value) => setForm((current) => ({
            ...current,
            primaryNeed: value as NeedType,
            additionalNeeds: current.additionalNeeds.filter((need) => need !== value),
          }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{NEED_TYPES.map((type) => <SelectItem key={type} value={type}>{RESCUE_NEED_LABELS[type]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-800">Ayudas complementarias</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {NEED_TYPES.filter((type) => type !== form.primaryNeed).map((type) => (
              <label key={type} className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3">
                <Checkbox
                  checked={form.additionalNeeds.includes(type)}
                  onCheckedChange={(checked) => setForm((current) => ({
                    ...current,
                    additionalNeeds: checked === true
                      ? [...current.additionalNeeds, type].slice(0, 4)
                      : current.additionalNeeds.filter((need) => need !== type),
                  }))}
                />
                <span className="text-sm text-slate-700">{RESCUE_NEED_LABELS[type]}</span>
              </label>
            ))}
          </div>
        </div>
        {[form.primaryNeed, ...form.additionalNeeds].map((type) => (
          <div key={type} className="space-y-2">
            <Label htmlFor={`need-detail-${type}`}>Detalle de {RESCUE_NEED_LABELS[type].toLowerCase()} <span className="font-normal text-slate-400">(opcional)</span></Label>
            <Input
              id={`need-detail-${type}`}
              maxLength={500}
              value={form.needDetails[type] || ''}
              onChange={(event) => setForm((current) => ({ ...current, needDetails: { ...current.needDetails, [type]: event.target.value } }))}
              placeholder="Información útil para coordinar esta ayuda"
            />
          </div>
        ))}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="apparent-condition">Estado aparente</Label>
        <Input
          id="apparent-condition"
          value={form.apparentCondition}
          maxLength={300}
          onChange={(event) => setForm((current) => ({ ...current, apparentCondition: event.target.value }))}
          placeholder="Ej. está asustado, camina bien y no se ven heridas"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="rescue-description">Descripción</Label>
        <Textarea
          id="rescue-description"
          rows={5}
          minLength={20}
          maxLength={2000}
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder="Contá dónde lo encontraste y qué ayuda necesita ahora"
          required
        />
      </div>

      <LocationField
        location={form.location}
        latitude={form.latitude}
        longitude={form.longitude}
        onLocationChange={(location) => setForm((current) => ({ ...current, location }))}
        onCoordinatesChange={(latitude, longitude) => setForm((current) => ({ ...current, latitude, longitude }))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {[form.primaryNeed, ...form.additionalNeeds].includes('FOSTER') && <div className="space-y-2">
          <Label>Radio de búsqueda</Label>
          <Select
            value={String(form.searchRadiusKm)}
            onValueChange={(value) => setForm((current) => ({ ...current, searchRadiusKm: Number(value) }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50].map((radius) => (
                <SelectItem key={radius} value={String(radius)}>{radius} km</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">Empieza en 5 km y después podés ampliarlo o reducirlo.</p>
        </div>}
        <div className="space-y-2">
          <Label htmlFor="requested-days">Tiempo estimado</Label>
          <div className="relative">
            <Input
              id="requested-days"
              type="number"
              min={1}
              max={90}
              value={form.requestedDays}
              onChange={(event) => setForm((current) => ({ ...current, requestedDays: Number(event.target.value) }))}
              className="pr-14"
            />
            <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-slate-400">días</span>
          </div>
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <Checkbox
          checked={form.consentAccepted}
          onCheckedChange={(checked) => setForm((current) => ({ ...current, consentAccepted: checked === true }))}
        />
        <span>
          Acepto que MascoTin use la ubicación exacta únicamente para calcular distancias. Otros usuarios verán solo la zona.
        </span>
      </label>

      <Button type="submit" className="w-full sm:w-auto" disabled={saving || form.images.length === 0}>
        {saving ? 'Buscando hogares…' : 'Crear solicitud de ayuda'}
      </Button>
    </form>
  );
}
