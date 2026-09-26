'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, Clock } from 'lucide-react';
import SlotPicker from '@/components/appointments/SlotPicker';
import { toast } from 'sonner';
import { useStoreViewer } from '@/components/shop/StoreViewerProvider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ServiceBookProps } from '@/lib/server/stores';
import { DEFAULT_TIME_ZONE, getTimeZoneLabel } from '@/lib/timezone-label';

interface Pet {
  id: string;
  name: string;
}

interface BookingResult {
  status: string;
  date: string;
  petName: string;
}

function formatSlot(value: string, timeZone: string) {
  return new Date(value).toLocaleString('es-AR', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

export function BookServiceButton({ service }: { service: ServiceBookProps }) {
  const { viewer, requireAuth } = useStoreViewer();
  const [open, setOpen] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [petId, setPetId] = useState('');
  const [date, setDate] = useState('');
  const [timeZone, setTimeZone] = useState(DEFAULT_TIME_ZONE);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);

  const [petsLoading, setPetsLoading] = useState(false);
  const [petsError, setPetsError] = useState('');

  const fetchPetsForBooking = async () => {
    setPetsLoading(true); setPetsError('');
    try {
    const response = await fetch('/api/pet/mine');
    if (response.status === 401) {
      requireAuth();
      return;
    }
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error('No pudimos cargar tus mascotas');
    if (data.success) {
      const nextPets: Pet[] = data.pets || [];
      setPets(nextPets);
      setPetId(nextPets[0]?.id || '');
    }
    } catch { setPetsError('No pudimos cargar tus mascotas. Cerrá y volvé a abrir la solicitud.'); }
    finally { setPetsLoading(false); }
  };

  const openBooking = () => {
    if (!viewer.isAuthenticated) return requireAuth();
    setOpen(true);
    setDate('');
    setResult(null);
    void fetchPetsForBooking();
  };

  const bookService = async () => {
    if (!petId || !date) return toast.error('Completá mascota y fecha');
    setBookingLoading(true);
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: service.id, petId, date }),
      });
      if (response.status === 401) return requireAuth();
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setResult({
        status: data.appointment?.status || 'PENDING',
        date: data.appointment?.date || date,
        petName: pets.find((pet) => pet.id === petId)?.name || '',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo reservar');
    } finally {
      setBookingLoading(false);
    }
  };

  const isConfirmed = result?.status === 'CONFIRMED';

  return (
    <>
      <Button className="bg-teal-600 hover:bg-teal-700" onClick={openBooking}>
        Reservar
      </Button>
      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && setOpen(false)}>
        <DialogContent>
          {result ? (
            <>
              <DialogHeader>
                <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                  {isConfirmed ? <CalendarCheck className="size-6" aria-hidden="true" /> : <Clock className="size-6" aria-hidden="true" />}
                </div>
                <DialogTitle>{isConfirmed ? 'Turno confirmado' : 'Solicitud enviada'}</DialogTitle>
                <DialogDescription>
                  {isConfirmed
                    ? 'Tu turno quedó confirmado. Te vamos a avisar si hay algún cambio.'
                    : 'El comercio debe confirmarla. Te vamos a avisar cuando responda.'}
                </DialogDescription>
              </DialogHeader>
              <div role="status" className="rounded-xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">{service.name}{result.petName ? ` · ${result.petName}` : ''}</p>
                <p className="mt-1 text-sm text-slate-700 first-letter:uppercase">{formatSlot(result.date, timeZone)}</p>
                <p className="mt-1 text-xs text-slate-500">Horario en {getTimeZoneLabel(timeZone)}</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
                <Button asChild className="bg-teal-600 hover:bg-teal-700">
                  <Link href="/appointments">Ver mis turnos</Link>
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Reservar cita</DialogTitle>
                <DialogDescription>Elegí la mascota y una fecha para solicitar la reserva. El prestador debe confirmarla.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-3">
                {petsLoading && <p role="status">Cargando mascotas...</p>}
                {petsError && <p role="alert" className="text-destructive">{petsError}</p>}
                {!petsLoading && !petsError && !pets.length && <Button asChild variant="outline"><Link href={`/create-pet?returnTo=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/shop')}`}>Crear perfil de mi mascota</Link></Button>}
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{service.name}</p>
                  <p className="mt-1 text-lg font-bold text-teal-700">${service.price.toLocaleString('es-AR')}</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Mascota</label>
                  <Select value={petId} onValueChange={setPetId}>
                    <SelectTrigger aria-label="Seleccionar mascota">
                      <SelectValue placeholder="Seleccioná una mascota" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>{pet.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Fecha y hora</label>
                  <SlotPicker serviceId={service.id} value={date} onChange={setDate} onTimeZoneChange={setTimeZone} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button
                  className="bg-teal-600 hover:bg-teal-700"
                  onClick={() => void bookService()}
                  disabled={!petId || !date || bookingLoading || petsLoading || Boolean(petsError)}
                >
                  {bookingLoading ? 'Enviando solicitud...' : 'Solicitar reserva'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
