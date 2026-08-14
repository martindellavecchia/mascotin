import { isAuthPage, isPublicPath } from '@/lib/route-access';

describe('route access helpers', () => {
  it('detects auth pages', () => {
    expect(isAuthPage('/login')).toBe(true);
    expect(isAuthPage('/register/extra')).toBe(true);
    expect(isAuthPage('/profile')).toBe(false);
  });

  it('keeps the landing page public', () => {
    expect(isPublicPath('/')).toBe(true);
  });

  it('keeps public assets out of auth protection', () => {
    expect(isPublicPath('/robots.txt')).toBe(true);
    expect(isPublicPath('/logo.svg')).toBe(true);
  });

  it('still protects application pages', () => {
    expect(isPublicPath('/profile')).toBe(false);
    expect(isPublicPath('/community')).toBe(false);
  });

  it('allows emergency QR pages without a session', () => {
    expect(isPublicPath('/p/abc123')).toBe(true);
    expect(isPublicPath('/pets/abc123')).toBe(false);
  });
});
