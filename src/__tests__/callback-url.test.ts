import { sanitizeCallbackUrl } from '@/lib/callback-url';

describe('sanitizeCallbackUrl', () => {
  it('defaults to /inicio when empty', () => {
    expect(sanitizeCallbackUrl(null)).toBe('/inicio');
    expect(sanitizeCallbackUrl(undefined)).toBe('/inicio');
    expect(sanitizeCallbackUrl('')).toBe('/inicio');
  });

  it('preserves relative path and query', () => {
    expect(sanitizeCallbackUrl('/adoptions?pet=1')).toBe('/adoptions?pet=1');
    expect(sanitizeCallbackUrl('/inicio?tab=explore')).toBe('/inicio?tab=explore');
  });

  it('rejects protocol-relative and absolute URLs', () => {
    expect(sanitizeCallbackUrl('//evil.example')).toBe('/inicio');
    expect(sanitizeCallbackUrl('https://evil.example/phish')).toBe('/inicio');
    expect(sanitizeCallbackUrl('http://localhost:3000')).toBe('/inicio');
  });

  it('rejects encoded protocol-relative URLs', () => {
    expect(sanitizeCallbackUrl('%2F%2Fevil.example')).toBe('/inicio');
  });

  it('rejects doubly encoded open redirects', () => {
    expect(sanitizeCallbackUrl('%252F%252Fevil.example')).toBe('/inicio');
    expect(sanitizeCallbackUrl('/%2F%2Fevil.example')).toBe('/inicio');
    expect(sanitizeCallbackUrl('%2F%5Cevil.example')).toBe('/inicio');
  });

  it('rejects backslashes and protocols inside the value', () => {
    expect(sanitizeCallbackUrl('/\\evil')).toBe('/inicio');
    expect(sanitizeCallbackUrl('/foo\\bar')).toBe('/inicio');
    expect(sanitizeCallbackUrl('/login?next=https://evil.example')).toBe('/inicio');
    expect(sanitizeCallbackUrl('/%5Cevil.example')).toBe('/inicio');
  });
});

