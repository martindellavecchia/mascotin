import { StrictMode, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import PrivateSessionProvider from '@/components/PrivateSessionProvider';
import ProfilePage from '@/app/(main)/profile/page';
import SettingsPage from '@/app/(main)/settings/page';
import EventsFeed from '@/components/community/EventsFeed';
import PetOnboardingWizard from '@/components/onboarding/PetOnboardingWizard';
import { useInvalidateViewerData, useOwnerProfile } from '@/hooks/useViewerData';
import type { Pet } from '@/types';

const mockSession = { user: { id: 'viewer-a', name: 'Ana' }, expires: '2099-01-01T00:00:00Z' };
jest.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSession: jest.fn(),
}));
jest.mock('next/navigation', () => {
  const router = { push: jest.fn() };
  return { useRouter: () => router, useSearchParams: () => new URLSearchParams() };
});
jest.mock('next-themes', () => ({ useTheme: () => ({ setTheme: jest.fn() }) }));
jest.mock('@/components/community/CreatePostCard', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/community/EditPostModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/OwnerForm', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/PetForm', () => ({ __esModule: true, default: () => null }));

const response = (data: unknown) => ({ ok: true, json: async () => data });
const owner = { id: 'owner-a', userId: 'viewer-a', name: 'Ana', location: 'Córdoba', createdAt: '2026-01-01T12:00:00Z' };
const requestCount = (path: string) => (global.fetch as jest.Mock).mock.calls.filter(([url]) => url === path).length;

describe('viewer navigation cache', () => {
  beforeEach(() => {
    (useSession as jest.Mock).mockReturnValue({ data: mockSession, status: 'authenticated' });
    (global.fetch as jest.Mock).mockReset().mockImplementation((url: string) => {
      if (url === '/api/owner/profile') return Promise.resolve(response({ success: true, owner }));
      if (url === '/api/pet/mine') return Promise.resolve(response({ success: true, pets: [] }));
      if (url === '/api/matches/count') return new Promise(() => {});
      return Promise.resolve(response({ posts: [] }));
    });
    window.history.replaceState(null, '', '/profile');
  });

  it('shows the profile while the encounter count is pending and reuses owner/pets between sections', async () => {
    const view = (page: React.ReactNode) => <PrivateSessionProvider session={mockSession}>{page}</PrivateSessionProvider>;
    const { rerender } = render(view(<ProfilePage />));
    expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeVisible();
    expect(requestCount('/api/matches/count')).toBe(1);
    expect(requestCount('/api/matches')).toBe(0);
    rerender(view(<EventsFeed />));
    expect(await screen.findByText('No hay publicaciones aún')).toBeVisible();
    rerender(view(<ProfilePage />));
    expect(screen.getByRole('heading', { name: 'Mi perfil' })).toBeVisible();
    expect(screen.queryByText('Cargando perfil...')).not.toBeInTheDocument();
    expect(requestCount('/api/owner/profile')).toBe(1);
    expect(requestCount('/api/pet/mine')).toBe(1);
  });

  it('refreshes edited data and discards the previous viewer cache on account change', async () => {
    const clients: ReturnType<typeof useQueryClient>[] = [];
    function ProfileProbe() {
      const client = useQueryClient();
      if (!clients.includes(client)) clients.push(client);
      const { data: session } = useSession();
      const query = useOwnerProfile(session?.user?.id);
      const invalidate = useInvalidateViewerData();
      return <><p>{query.data?.owner?.name ?? 'Cargando'}</p><button onClick={invalidate}>Actualizar perfil</button></>;
    }
    const view = () => <StrictMode><PrivateSessionProvider session={mockSession}><ProfileProbe /></PrivateSessionProvider></StrictMode>;
    const { rerender } = render(view());
    expect(await screen.findByText('Ana')).toBeVisible();
    (global.fetch as jest.Mock).mockResolvedValue(response({ owner: { ...owner, name: 'Ana editada' } }));
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar perfil' }));
    expect(await screen.findByText('Ana editada')).toBeVisible();
    const previousClient = clients.at(-1)!;

    (useSession as jest.Mock).mockReturnValue({ data: { ...mockSession, user: { id: 'viewer-b', name: 'Beto' } }, status: 'authenticated' });
    (global.fetch as jest.Mock).mockResolvedValue(response({ owner: { ...owner, id: 'owner-b', name: 'Beto' } }));
    rerender(view());
    expect(screen.queryByText('Ana editada')).not.toBeInTheDocument();
    expect(await screen.findByText('Beto')).toBeVisible();
    await waitFor(() => expect(previousClient.getQueryCache().getAll()).toHaveLength(0));
    expect(clients.at(-1)).not.toBe(previousClient);
  });

  it('shows account settings without waiting for pet photos', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/pet/mine') return new Promise(() => {});
      return Promise.resolve(response({ success: true, settings: {
        theme: 'light', matchingPaused: false, matchDistance: 20, matchPetTypes: [], matchPetSizes: [],
        notifyMatches: true, notifyMessages: true, notifyComments: true, notifyEvents: true,
        notifyHealth: true, notifyFoster: true, profileVisible: true, hideResolvedLostPets: true,
      } }));
    });
    render(<PrivateSessionProvider session={mockSession}><SettingsPage /></PrivateSessionProvider>);
    expect(await screen.findByRole('switch', { name: 'Hacer visible mi perfil' })).toBeVisible();
    expect(requestCount('/api/owner/pets')).toBe(0);
    await userEvent.click(screen.getByRole('tab', { name: 'Mascotas' }));
    expect(screen.getByText('Cargando tus mascotas')).toBeVisible();
    expect(screen.getByRole('switch', { name: 'Pausar matching' })).toBeVisible();
  });

  it('replaces a fresh empty pet list after creating the first pet in onboarding', async () => {
    let created = false;
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      const pet: Pet = {
        id: 'mora', ownerId: owner.id, name: 'Mora', petType: 'dog', age: 0, size: '', gender: '',
        vaccinated: null, neutered: null, energy: '', bio: '', activities: [], location: '', images: '[]',
        level: 1, xp: 0, totalMatches: 0, isActive: true, createdAt: owner.createdAt, updatedAt: owner.createdAt,
      };
      if (url === '/api/pet/create') {
        created = true;
        return Promise.resolve(response({ success: true, pet }));
      }
      if (url === '/api/pet/mine') return Promise.resolve(response({ success: true, pets: created ? [pet] : [] }));
      if (url === '/api/owner/profile') return Promise.resolve(response({ success: true, owner }));
      return Promise.resolve(response({ count: 0 }));
    });
    function CreationFlow() {
      const [complete, setComplete] = useState(false);
      return complete ? <ProfilePage /> : <PetOnboardingWizard onSuccess={() => setComplete(true)} onCancel={() => {}} />;
    }
    const view = (page: React.ReactNode) => <PrivateSessionProvider session={mockSession}>{page}</PrivateSessionProvider>;
    const { rerender } = render(view(<ProfilePage />));
    await screen.findByRole('heading', { name: 'Mi perfil' });
    rerender(view(<CreationFlow />));
    await userEvent.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Mora');
    await userEvent.click(screen.getByRole('radio', { name: 'Perro' }));
    await userEvent.click(screen.getByRole('button', { name: /Crear/ }));
    expect(await screen.findByRole('heading', { name: 'Mora' })).toBeVisible();
    expect(requestCount('/api/pet/mine')).toBe(2);
  });
});
