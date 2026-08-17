'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useStoreViewer } from '@/components/shop/StoreViewerProvider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ServiceBookProps } from '@/lib/server/stores';

interface Pet {
  id: string;
  name: string;
}

export function BookServiceButton({ service }: { service: ServiceBookProps }) {
  const { viewer, requireAuth } = useStoreViewer();
  const [open, setOpen] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [petId, setPetId] = useState('');
  const [date, setDate] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  const nextDays = Array.from({ length: 7 }, (_, index) => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + index + 1);
    nextDate.setHours(10, 0, 0, 0);
    return {
      value: nextDate.toISOString(),
      label: nextDate.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · 10:00',
    };
  });

  const fetchPetsForBooking = async () => {
    const response = await fetch('/api/pet/mine');
    if (response.status === 401) {
      requireAuth();
      return;
    }
    const data = await response.json();
    if (data.success) {
      const nextPets: Pet[] = data.pets || [];
      setPets(nextPets);
      setPetId(nextPets[0]?.id || '');
    }
  };

  const openBooking = () => {
    if (!viewer.isAuthenticated) return requireAuth();
    setOpen(true);
    setDate('');
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
      toast.success('Cita reservada exitosamente');
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo reservar');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <>
      <Button className="bg-teal-600 hover:bg-teal-700" onClick={openBooking}>
        Reservar
      </Button>
      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservar cita</DialogTitle>
            <DialogDescription>Elegí la mascota y un horario disponible para confirmar la reserva.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
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
              <Select value={date} onValueChange={setDate}>
                <SelectTrigger aria-label="Seleccionar fecha y hora">
                  <SelectValue placeholder="Seleccioná fecha" />
                </SelectTrigger>
                <SelectContent>
                  {nextDays.map((day) => (
                    <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => void bookService()}
              disabled={!petId || !date || bookingLoading}
            >
              {bookingLoading ? 'Reservando...' : 'Confirmar reserva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
