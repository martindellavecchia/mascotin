const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function canQueryMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

export function prefersReducedMotion(): boolean {
  return canQueryMedia() && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function preferredScrollBehavior(): ScrollBehavior {
  if (!canQueryMedia()) return 'auto';
  return prefersReducedMotion() ? 'auto' : 'smooth';
}
