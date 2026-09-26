export interface StoreContactSource {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface StoreContactLinks {
  call: string | null;
  whatsapp: string | null;
  email: string | null;
  directions: string | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function phoneDigits(phone: string) {
  return phone.replace(/\D/g, '');
}

export function toTelHref(phone: string | null): string | null {
  if (!phone?.trim()) return null;
  const digits = phoneDigits(phone);
  if (digits.length < 6) return null;
  return `tel:${phone.trim().startsWith('+') ? '+' : ''}${digits}`;
}

/** Only Argentine mobile numbers in international format (+54 9 ...) are reliably WhatsApp-capable. */
export function toWhatsAppNumber(phone: string | null): string | null {
  if (!phone?.trim()) return null;
  const digits = phoneDigits(phone);
  if (digits.startsWith('549') && digits.length >= 12 && digits.length <= 13) return digits;
  return null;
}

export function getStoreContactLinks(store: StoreContactSource): StoreContactLinks {
  const whatsappNumber = toWhatsAppNumber(store.phone);
  const email = store.email?.trim();
  const hasCoordinates =
    typeof store.latitude === 'number' &&
    typeof store.longitude === 'number' &&
    Number.isFinite(store.latitude) &&
    Number.isFinite(store.longitude);
  const destination = hasCoordinates
    ? `${store.latitude},${store.longitude}`
    : store.address?.trim() || null;

  return {
    call: toTelHref(store.phone),
    whatsapp: whatsappNumber
      ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola ${store.name}, los encontré en Huella.`)}`
      : null,
    email: email && EMAIL_PATTERN.test(email) ? `mailto:${email}` : null,
    directions: destination
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
      : null,
  };
}
