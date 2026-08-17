'use client';

import { useState } from 'react';
import { LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface LocationFieldProps {
  location: string;
  latitude?: number;
  longitude?: number;
  onLocationChange: (value: string) => void;
  onCoordinatesChange: (latitude: number, longitude: number) => void;
}
export default function LocationField({
  location,
  latitude,
  longitude,
  onLocationChange,
  onCoordinatesChange,
}: LocationFieldProps) {
  const [locating, setLocating] = useState(false);
  const hasCoordinates = typeof latitude === 'number' && typeof longitude === 'number';

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no permite obtener la ubicación');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onCoordinatesChange(position.coords.latitude, position.coords.longitude);
        setLocating(false);
        toast.success('Ubicación exacta guardada de forma privada');
      },
      () => {
        setLocating(false);
        toast.error('No pudimos obtener tu ubicación. Podés ingresar la zona manualmente.');
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="help-location">Zona o barrio</Label>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input
          id="help-location"
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
          placeholder="Ej. Palermo, CABA"
          maxLength={200}
          required
        />
        <Button type="button" variant="outline" onClick={useCurrentLocation} disabled={locating}>
          <LocateFixed className="mr-2 size-5" aria-hidden="true" />
          {locating ? 'Ubicando…' : hasCoordinates ? 'Ubicación lista' : 'Usar ubicación actual'}
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        La ubicación exacta se usa para calcular distancias y nunca se muestra a otros usuarios.
      </p>
    </div>
  );
}
