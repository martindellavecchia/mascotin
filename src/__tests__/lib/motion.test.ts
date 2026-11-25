import { preferredScrollBehavior, prefersReducedMotion } from '@/lib/motion';

function mockReducedMotion(reduce: boolean) {
  (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
  }));
}

describe('motion preferences', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('follows the reduced motion media query', () => {
    window.matchMedia = jest.fn() as unknown as typeof window.matchMedia;
    mockReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(preferredScrollBehavior()).toBe('auto');

    mockReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
    expect(preferredScrollBehavior()).toBe('smooth');
  });

  it('avoids smooth scrolling when the preference cannot be read', () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    expect(prefersReducedMotion()).toBe(false);
    expect(preferredScrollBehavior()).toBe('auto');
  });
});
