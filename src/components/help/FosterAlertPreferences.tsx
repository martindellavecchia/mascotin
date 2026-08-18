'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const SPECIES = [
  { value: 'dog', label: 'Perros' },
  { value: 'cat', label: 'Gatos' },
  { value: 'other', label: 'Otros' },
] as const;

const URGENCIES = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'CRITICAL', label: 'Crítica' },
] as const;

interface AlertPreferences {
  enabled: boolean;
  radiusKm: number;
  species: string[];
  urgencies: string[];
}

const DEFAULTS: AlertPreferences = {
  enabled: false,
  radiusKm: 5,
  species: ['dog', 'cat', 'other'],
  urgencies: ['NORMAL', 'HIGH', 'CRITICAL'],
};

export default function FosterAlertPreferences({ enabled }: { enabled: boolean }) {
  const [preferences, setPreferences] = useState(DEFAULTS);
  const [loading, setLoading] = useState(enabled);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    fetch('/api/foster/alert-preferences')
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.preferences) setPreferences(data.preferences);
      })
      .catch(() => toast.error('No se pudieron cargar las alertas'))
      .finally(() => setLoading(false));
  }, [enabled]);

  const toggleList = (key: 'species' | 'urgencies', value: string) => {
    setPreferences((current) => {
      const values = current[key];
      const next = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
      return { ...current, [key]: next };
    });
  };

  const save = async () => {
    if (preferences.species.length === 0 || preferences.urgencies.length === 0) {
      toast.error('Elegí al menos una especie y una urgencia');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/foster/alert-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'No se pudieron guardar las alertas');
      setPreferences(data.preferences);
      toast.success('Preferencias de alertas guardadas');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron guardar las alertas');
    } finally {
      setSaving(false);
    }
  };

  if (!enabled) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas de casos cercanos</CardTitle>
        <p className="text-sm text-slate-500">Son voluntarias y llegan sólo dentro de Huella.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? <div className="h-28 animate-pulse rounded-xl bg-slate-100" /> : (
          <>
            <div className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
              <div>
                <Label htmlFor="foster-case-alerts" className="font-medium">Recibir alertas</Label>
                <p className="mt-1 text-xs text-slate-500">Tu perfil debe permanecer activo y con cupo.</p>
              </div>
              <Switch id="foster-case-alerts" checked={preferences.enabled} onCheckedChange={(checked) => setPreferences((current) => ({ ...current, enabled: checked }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="foster-alert-radius">Radio de alertas</Label>
              <div className="flex items-center gap-2">
                <Input id="foster-alert-radius" type="number" min={1} max={50} value={preferences.radiusKm} onChange={(event) => setPreferences((current) => ({ ...current, radiusKm: Math.min(50, Math.max(1, Number(event.target.value) || 1)) }))} className="max-w-28" />
                <span className="text-sm text-slate-500">km desde tu zona</span>
              </div>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-800">Especies</legend>
              <div className="flex flex-wrap gap-3">
                {SPECIES.map((item) => <label key={item.value} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3"><Checkbox checked={preferences.species.includes(item.value)} onCheckedChange={() => toggleList('species', item.value)} />{item.label}</label>)}
              </div>
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-800">Urgencia</legend>
              <div className="flex flex-wrap gap-3">
                {URGENCIES.map((item) => <label key={item.value} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3"><Checkbox checked={preferences.urgencies.includes(item.value)} onCheckedChange={() => toggleList('urgencies', item.value)} />{item.label}</label>)}
              </div>
            </fieldset>
            <Button disabled={saving} onClick={() => void save()}>{saving ? 'Guardando…' : 'Guardar alertas'}</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
