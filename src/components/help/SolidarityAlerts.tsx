'use client';

import { useEffect, useState } from 'react';
import LocationField from '@/components/help/LocationField';
import PushNotificationControl from '@/components/help/PushNotificationControl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

type AlertType = 'FOSTER' | 'ADOPTION' | 'VETERINARY';
type FilterKey = 'species' | 'sizes' | 'urgencies';

interface SubscriptionForm {
  type: AlertType;
  enabled: boolean;
  radiusKm: number;
  species: string[];
  sizes: string[];
  urgencies: string[];
}

const CONFIG: Record<AlertType, { title: string; description: string; filters: FilterKey[] }> = {
  FOSTER: { title: 'Tránsito', description: 'Casos que necesitan un hogar temporal.', filters: ['species', 'sizes', 'urgencies'] },
  ADOPTION: { title: 'Adopción', description: 'Nuevas fichas de adopción cercanas.', filters: ['species', 'sizes'] },
  VETERINARY: { title: 'Urgencia veterinaria', description: 'Casos que requieren acompañamiento veterinario.', filters: ['species', 'urgencies'] },
};

const OPTIONS: Record<FilterKey, Array<{ value: string; label: string }>> = {
  species: [{ value: 'dog', label: 'Perros' }, { value: 'cat', label: 'Gatos' }, { value: 'other', label: 'Otros' }],
  sizes: [{ value: 'small', label: 'Pequeños' }, { value: 'medium', label: 'Medianos' }, { value: 'large', label: 'Grandes' }],
  urgencies: [{ value: 'NORMAL', label: 'Normal' }, { value: 'HIGH', label: 'Alta' }, { value: 'CRITICAL', label: 'Crítica' }],
};

const DEFAULT_SUBSCRIPTIONS: SubscriptionForm[] = (['FOSTER', 'ADOPTION', 'VETERINARY'] as AlertType[]).map((type) => ({
  type,
  enabled: false,
  radiusKm: 5,
  species: [],
  sizes: [],
  urgencies: [],
}));

export default function SolidarityAlerts() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number>();
  const [longitude, setLongitude] = useState<number>();
  const [locationConsent, setLocationConsent] = useState(false);
  const [subscriptions, setSubscriptions] = useState(DEFAULT_SUBSCRIPTIONS);

  useEffect(() => {
    fetch('/api/solidarity-alerts')
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.profile) {
          setLocation(data.profile.location || '');
          setLocationConsent(true);
          setSubscriptions(data.profile.subscriptions || DEFAULT_SUBSCRIPTIONS);
        }
      })
      .catch(() => toast.error('No pudimos cargar tus alertas'))
      .finally(() => setLoading(false));
  }, []);

  const updateSubscription = (type: AlertType, change: Partial<SubscriptionForm>) => {
    setSubscriptions((current) => current.map((subscription) => subscription.type === type ? { ...subscription, ...change } : subscription));
  };

  const toggleFilter = (type: AlertType, key: FilterKey, value: string) => {
    setSubscriptions((current) => current.map((subscription) => {
      if (subscription.type !== type) return subscription;
      const values = subscription[key];
      return { ...subscription, [key]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value] };
    }));
  };

  const save = async () => {
    if (!location.trim() || !locationConsent) {
      toast.error('Indicá tu zona y aceptá el uso privado de ubicación');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/solidarity-alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, latitude, longitude, locationConsent, subscriptions }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'No se pudieron guardar las alertas');
      setSubscriptions(data.profile.subscriptions);
      toast.success('Alertas solidarias guardadas');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron guardar las alertas');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Alertas solidarias</h2>
        <p className="mt-1 text-sm text-slate-500">Son independientes de tu hogar y tu perfil de voluntariado. Todas empiezan desactivadas.</p>
      </div>
      {loading ? <div className="h-48 animate-pulse rounded-2xl bg-slate-200" /> : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-lg">Tu zona privada</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <LocationField
                location={location}
                latitude={latitude}
                longitude={longitude}
                onLocationChange={setLocation}
                onCoordinatesChange={(nextLatitude, nextLongitude) => { setLatitude(nextLatitude); setLongitude(nextLongitude); }}
              />
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <Checkbox checked={locationConsent} onCheckedChange={(checked) => setLocationConsent(checked === true)} />
                <span>Acepto que MascoTin use esta ubicación sólo para calcular coincidencias. Nadie verá mis coordenadas.</span>
              </label>
            </CardContent>
          </Card>
          <div className="grid gap-4 lg:grid-cols-3">
            {subscriptions.map((subscription) => {
              const config = CONFIG[subscription.type];
              return (
                <Card key={subscription.type} className={subscription.enabled ? 'border-teal-200' : ''}>
                  <CardHeader className="space-y-3">
                    <div className="flex min-h-11 items-center justify-between gap-3">
                      <CardTitle className="text-base">{config.title}</CardTitle>
                      <Switch
                        aria-label={`Activar alertas de ${config.title}`}
                        checked={subscription.enabled}
                        onCheckedChange={(enabled) => updateSubscription(subscription.type, { enabled })}
                      />
                    </div>
                    <p className="text-sm font-normal text-slate-500">{config.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`radius-${subscription.type}`}>Radio</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`radius-${subscription.type}`}
                          type="number"
                          min={1}
                          max={50}
                          value={subscription.radiusKm}
                          onChange={(event) => updateSubscription(subscription.type, { radiusKm: Math.min(50, Math.max(1, Number(event.target.value) || 1)) })}
                          className="max-w-24"
                        />
                        <span className="text-sm text-slate-500">km</span>
                      </div>
                    </div>
                    {config.filters.map((filter) => (
                      <fieldset key={filter} className="space-y-2">
                        <legend className="text-sm font-medium text-slate-800">{filter === 'species' ? 'Especie' : filter === 'sizes' ? 'Tamaño' : 'Urgencia'}</legend>
                        <div className="space-y-1">
                          {OPTIONS[filter].map((option) => (
                            <label key={option.value} className="flex min-h-10 items-center gap-2 rounded-lg px-2 hover:bg-slate-50">
                              <Checkbox checked={subscription[filter].includes(option.value)} onCheckedChange={() => toggleFilter(subscription.type, filter, option.value)} />
                              <span className="text-sm text-slate-600">{option.label}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-slate-400">Sin selección = todas.</p>
                      </fieldset>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Button disabled={saving} onClick={() => void save()}>{saving ? 'Guardando…' : 'Guardar alertas'}</Button>
        </>
      )}
      <Card>
        <CardHeader><CardTitle className="text-lg">Avisos del navegador</CardTitle></CardHeader>
        <CardContent><PushNotificationControl /></CardContent>
      </Card>
    </div>
  );
}
