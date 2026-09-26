import { getStoreContactLinks, toTelHref, toWhatsAppNumber } from '@/lib/store-contact';

const base = {
  name: 'Paw Spa',
  phone: null,
  email: null,
  address: null,
  latitude: null,
  longitude: null,
};

describe('store contact links', () => {
  it('returns no links when the store has no contact data', () => {
    expect(getStoreContactLinks(base)).toEqual({
      call: null,
      whatsapp: null,
      email: null,
      directions: null,
    });
  });

  it('builds tel links keeping the international prefix', () => {
    expect(toTelHref('+54 9 11 5555-1234')).toBe('tel:+5491155551234');
    expect(toTelHref('4555-1234')).toBe('tel:45551234');
    expect(toTelHref('123')).toBeNull();
  });

  it('only offers WhatsApp for Argentine mobile numbers in international format', () => {
    expect(toWhatsAppNumber('+54 9 11 5555-1234')).toBe('5491155551234');
    expect(toWhatsAppNumber('+54 11 4555-1234')).toBeNull();
    expect(toWhatsAppNumber('4555-1234')).toBeNull();
  });

  it('prefers coordinates over the address for directions', () => {
    expect(getStoreContactLinks({ ...base, address: 'Palermo', latitude: -34.5, longitude: -58.4 }).directions).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-34.5%2C-58.4'
    );
    expect(getStoreContactLinks({ ...base, address: 'Av. Santa Fe 1234, CABA' }).directions).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=Av.%20Santa%20Fe%201234%2C%20CABA'
    );
  });

  it('ignores malformed emails', () => {
    expect(getStoreContactLinks({ ...base, email: 'hola@pawspa.com' }).email).toBe('mailto:hola@pawspa.com');
    expect(getStoreContactLinks({ ...base, email: 'no-es-un-mail' }).email).toBeNull();
  });
});
