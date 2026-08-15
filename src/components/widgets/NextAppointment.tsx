'use client';

import Link from 'next/link';
import { CalendarCheck2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { HomeAppointmentData } from '@/lib/server/home';

interface NextAppointmentProps {
  appointment: HomeAppointmentData | null;
}

const VISIBLE_UPCOMING_STATUSES = new Set(['PENDING', 'CONFIRMED']);
const APP_TIME_ZONE = 'America/Argentina/Buenos_Aires';

const appointmentMonthFormatter = new Intl.DateTimeFormat('es-AR', {
  month: 'short',
  timeZone: APP_TIME_ZONE,
});
const appointmentDayFormatter = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  timeZone: APP_TIME_ZONE,
});
const appointmentTimeFormatter = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: APP_TIME_ZONE,
});

function formatAppointmentDate(dateStr: string) {
  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) {
    return { month: '—', day: '—', time: '—' };
  }

  return {
    month: appointmentMonthFormatter.format(date).toUpperCase(),
    day: appointmentDayFormatter.format(date),
    time: appointmentTimeFormatter.format(date),
  };
}

function getStatusColor(status: string) {
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
}

function getStatusLabel(status: string) {
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
}

export default function NextAppointment({ appointment }: NextAppointmentProps) {
  const nextAppointment =
    appointment && VISIBLE_UPCOMING_STATUSES.has(appointment.status)
      ? appointment
      : null;

  if (!nextAppointment) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Próxima cita</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-slate-400">
            <CalendarCheck2 className="mx-auto mb-2 size-8" aria-hidden="true" />
            <p className="text-sm">No tienes citas programadas</p>
            <Button
              asChild
              variant="link"
              className="mt-2 min-h-11 text-teal-600"
            >
              <Link href="/shop">Agendar una cita</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { month, day, time } = formatAppointmentDate(nextAppointment.date);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Próxima cita</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3">
          <time
            dateTime={nextAppointment.date}
            className="flex min-w-[50px] shrink-0 flex-col items-center justify-center rounded-lg bg-orange-50 px-3 py-2"
          >
            <span className="text-[10px] font-bold text-orange-600">{month}</span>
            <span className="text-xl font-bold text-orange-700">{day}</span>
          </time>
          <div className="min-w-0 flex-1">
            <p className="break-words font-semibold text-slate-800">
              {nextAppointment.service.name}
            </p>
            <p className="break-words text-sm text-slate-500">
              {nextAppointment.service.provider.businessName} • {time}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  nextAppointment.status === 'CONFIRMED'
                    ? 'bg-teal-500'
                    : 'bg-amber-500'
                }`}
                aria-hidden="true"
              />
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
