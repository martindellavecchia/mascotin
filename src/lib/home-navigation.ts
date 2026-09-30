import type { MouseEvent } from 'react';

export type HomeTab = 'home' | 'explore' | 'matches';

export function getHomeTab(value: string | null): HomeTab {
  return value === 'explore' || value === 'matches' ? value : 'home';
}

export function getHomeHref(tab: HomeTab, petId?: string | null) {
  const params = new URLSearchParams({ tab });
  if (petId) params.set('petId', petId);
  return '/inicio?' + params.toString();
}

export function navigateHome(tab: HomeTab, petId?: string | null) {
  const href = getHomeHref(tab, petId);
  if (window.location.pathname + window.location.search !== href) {
    window.history.pushState(null, '', href);
  }
}

export function handleHomeLink(event: MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.currentTarget.target === '_blank') return;
  const target = new URL(event.currentTarget.href);
  if (window.location.pathname !== '/inicio' || target.pathname !== '/inicio') return;
  event.preventDefault();
  navigateHome(getHomeTab(target.searchParams.get('tab')), target.searchParams.get('petId'));
}
