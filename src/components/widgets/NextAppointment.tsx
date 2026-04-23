'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { HomeAppointmentData } from '@/lib/server/home';

interface NextAppointmentProps {
  appointment: HomeAppointmentData | null;
}

const VISIBLE_UPCOMING_STATUSES = new Set(['PENDING', 'CONFIRMED']);

export default function NextAppointment({ appointment }: NextAppointmentProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      month: date.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase(),
      day: date.getDate(),
      time: date.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'text-teal-600';
      case 'PENDING':
        return 'text-amber-600';
      case 'CANCELLED':
        return 'text-red-600';
      default:
        return 'text-slate-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmado';
      case 'PENDING':
        return 'Pendiente';
      case 'CANCELLED':
        return 'Cancelado';
      case 'COMPLETED':
        return 'Completado';
      default:
        return status;
    }
  };

  const nextAppointment =
    appointment && VISIBLE_UPCOMING_STATUSES.has(appointment.status)
      ? appointment
      : null;

  if (!nextAppointment) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Próxima Cita</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-slate-400">
            <span className="material-symbols-rounded text-3xl mb-2">
              event_available
            </span>
            <p className="text-sm">No tienes citas programadas</p>
            <Button
              variant="link"
              className="text-teal-600 mt-2"
              onClick={() => window.location.href = '/shop'}
            >
              Agendar una cita
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { month, day, time } = formatDate(nextAppointment.date);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Próxima Cita</CardTitle>
          <Button variant="link" className="text-teal-600 text-sm p-0 h-auto">
            Ver todo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center justify-center bg-orange-50 rounded-lg px-3 py-2 min-w-[50px]">
            <span className="text-[10px] font-bold text-orange-600">{month}</span>
            <span className="text-xl font-bold text-orange-700">{day}</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-800">
              {nextAppointment.service.name}
            </p>
            <p className="text-sm text-slate-500">
              {nextAppointment.service.provider.businessName} • {time}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  nextAppointment.status === 'CONFIRMED'
                    ? 'bg-teal-500'
                    : 'bg-amber-500'
                }`}
              ></span>
              <span className={`text-xs ${getStatusColor(nextAppointment.status)}`}>
                {getStatusLabel(nextAppointment.status)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
