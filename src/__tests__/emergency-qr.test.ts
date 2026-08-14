import { createEmergencyToken, createPublicSlug } from '@/lib/passport';
import { isPublicPath } from '@/lib/route-access';

describe('emergency QR helpers', () => {
  it('creates a unique token and slug', () => {
    const token = createEmergencyToken();
    expect(token).toHaveLength(32);
    expect(createPublicSlug('Luna Pérez', 'abcdefghijklmnop')).toContain('luna-perez');
  });

  it('exposes the scan URL without authentication', () => {
    expect(isPublicPath('/p/abc123token')).toBe(true);
  });
});
