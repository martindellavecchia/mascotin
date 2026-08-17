import type { NotificationType } from '@prisma/client';

export const PUSH_ELIGIBLE_TYPES = new Set<NotificationType>([
  'MESSAGE',
  'ADOPTION_APPLICATION',
  'ADOPTION_MATCH',
  'FOSTER_OFFER',
  'FOSTER_RESPONSE',
  'FOSTER_PLACEMENT',
  'FOSTER_CASE_ALERT',
  'FOSTER_ADOPTION',
  'VOLUNTEER_OFFER',
  'VOLUNTEER_RESPONSE',
  'VOLUNTEER_ASSIGNMENT',
  'SOLIDARITY_ADOPTION_ALERT',
  'SOLIDARITY_VETERINARY_ALERT',
]);

export interface PrivatePushPayload {
  title: string;
  zone: string;
  helpType: string;
  link: string;
}

const HELP_TYPE_LABELS: Partial<Record<NotificationType, string>> = {
  MESSAGE: 'Mensaje de coordinación',
  ADOPTION_APPLICATION: 'Adopción',
  ADOPTION_MATCH: 'Adopción',
  FOSTER_OFFER: 'Hogar de tránsito',
  FOSTER_RESPONSE: 'Hogar de tránsito',
  FOSTER_PLACEMENT: 'Hogar de tránsito',
  FOSTER_CASE_ALERT: 'Hogar de tránsito',
  FOSTER_ADOPTION: 'Adopción',
  VOLUNTEER_OFFER: 'Voluntariado',
  VOLUNTEER_RESPONSE: 'Voluntariado',
  VOLUNTEER_ASSIGNMENT: 'Voluntariado',
  SOLIDARITY_ADOPTION_ALERT: 'Adopción',
  SOLIDARITY_VETERINARY_ALERT: 'Ayuda veterinaria',
};

function internalLink(link: string | null | undefined, deliveryId: string) {
  const safePath = link?.startsWith('/') ? link : '/notifications';
  const url = new URL(safePath, 'https://mascotin.invalid');
  url.searchParams.set('pushDelivery', deliveryId);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildPrivatePushPayload(input: {
  notificationType: NotificationType;
  title: string;
  link?: string | null;
  deliveryId: string;
  zone?: string | null;
  helpType?: string | null;
}): PrivatePushPayload {
  return {
    title: input.title.slice(0, 120),
    zone: (input.zone?.trim() || 'Cerca de tu zona').slice(0, 120),
    helpType: (input.helpType?.trim() || HELP_TYPE_LABELS[input.notificationType] || 'Actualización solidaria').slice(0, 80),
    link: internalLink(input.link, input.deliveryId),
  };
}

export function isPushEligible(type: NotificationType) {
  return PUSH_ELIGIBLE_TYPES.has(type);
}
