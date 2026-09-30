import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { installTestHistory } from '@/mocks/navigation';
import NoPetsHome from '@/components/home/NoPetsHome';
import HomeClientShell from '@/components/home/HomeClientShell';

const mockPush = jest.fn();
const mockFetchWithError = jest.fn();
jest.mock('@/components/home/UndoPassButton', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/home/PendingActions', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/home/IntentEntry', () => ({ __esModule: true, default: () => null }));

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loader: () => unknown, options?: { loading?: () => React.ReactNode }) => {
    if (String(loader).includes('ExploreTab')) return jest.requireActual('@/components/home/ExploreTab').default;
    return function MockDynamicComponent() { return <>{options?.loading ? options.loading() : null}</>; };
  },
}));

jest.mock('next/navigation', () => ({
  useSearchParams: jest.requireActual('@/mocks/navigation').useTestSearchParams,
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/hooks/useFetchWithError', () => ({
  useFetchWithError: () => ({
    fetchWithError: mockFetchWithError,
  }),
}));

jest.mock('@/components/DashboardLayout', () => ({
  __esModule: true,
  default: ({
    rightSidebar,
    children,
  }: {
    rightSidebar?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <main>{children}</main>
      <aside>{rightSidebar}</aside>
    </div>
  ),
}));

jest.mock('@/components/feed/Feed', () => ({
  __esModule: true,
  default: () => <div>Feed</div>,
}));

jest.mock('@/components/home/DeferredVisibilitySection', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/tabs', () => {
  const TabsContext = React.createContext({
    value: 'home',
    onValueChange: (_value: string) => {},
  });

  return {
    Tabs: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange: (value: string) => void;
      children: React.ReactNode;
    }) => (
      <TabsContext.Provider value={{ value, onValueChange }}>
        {children}
      </TabsContext.Provider>
    ),
    TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({
      value,
      children,
    }: {
      value: string;
      children: React.ReactNode;
    }) => {
      const context = React.useContext(TabsContext);

      return (
        <button type="button" onClick={() => context.onValueChange(value)}>
          {children}
        </button>
      );
    },
    TabsContent: ({
      value,
      children,
    }: {
      value: string;
      children: React.ReactNode;
    }) => {
      const context = React.useContext(TabsContext);
      return context.value === value ? <div>{children}</div> : null;
    },
  };
});

function createPet(id: string, name: string) {
  return {
    id,
    ownerId: 'owner-1',
    name,
    petType: 'dog',
    age: 3,
    size: 'medium',
    gender: 'male',
    vaccinated: true,
    neutered: true,
    energy: 'medium',
    bio: `${name} bio`,
    activities: ['walk'],
    location: 'Buenos Aires',
    images: '[]',
    level: 1,
    xp: 0,
    totalMatches: 0,
    isActive: true,
    createdAt: '2026-04-22T10:00:00.000Z',
    updatedAt: '2026-04-22T10:00:00.000Z',
  };
}

function buildProps() {
  return {
    session: {
      user: {
        id: 'user-1',
        name: 'Tester',
        email: 'test@example.com',
        image: null,
        role: 'OWNER',
        headerImage: null,
      },
    },
    initialPets: [createPet('pet-1', 'Max'), createPet('pet-2', 'Luna')],
    initialSelectedPetId: 'pet-1',
    initialStats: {
      totalPets: 2,
      totalMatches: 0,
      totalSwipes: 0,
      likesReceived: 0,
    },
    initialNextAppointment: null,
    initialFeedPosts: [],
    initialFeedNextCursor: null,
    initialFeedHasMore: false,
    initialLostPets: [],
    initialSuggestions: [],
    initialHealthRecords: [],
    showCommunityFeed: true,
  };
}

describe('HomeClientShell', () => {
  let restoreHistory: () => void;
  beforeAll(() => { restoreHistory = installTestHistory(); });
  afterAll(() => restoreHistory());
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState(null, '', '/inicio');
    mockFetchWithError.mockImplementation(async (url: string) => {
      if (url === '/api/matches') {
        return { success: true, data: { matches: [] } };
      }

      if (url.startsWith('/api/pets?currentPetId=')) {
        return { success: true, data: { pets: [] } };
      }

      return { success: true, data: {} };
    });
  });

  function renderShell(overrides: Partial<React.ComponentProps<typeof HomeClientShell>> = {}) {
    return render(<HomeClientShell {...buildProps()} {...overrides} />);
  }

  it('does not fetch matches or explore data on the initial home tab', () => {
    renderShell();

    expect(mockFetchWithError).not.toHaveBeenCalled();
  });

  it('shows today actions without the feed for a pet without community', () => {
    renderShell({ showCommunityFeed: false });

    expect(screen.getByRole('heading', { name: /elegí una acción con max/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /conocé una mascota/i })).toHaveAttribute('href', '/inicio?tab=explore&petId=pet-1');
    expect(screen.queryByText('Feed')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /círculo/i })).not.toBeInTheDocument();
  });

  it('fetches explore data only after opening the explore tab', async () => {
    renderShell();
    await userEvent.click(screen.getByRole('link', { name: /conocé una mascota/i }));

    await waitFor(() => {
      expect(mockFetchWithError).toHaveBeenCalledWith('/api/pets?currentPetId=pet-1', expect.anything());
    });
    expect(mockFetchWithError).not.toHaveBeenCalledWith('/api/matches', expect.anything());
  });

  it('fetches matches only after opening the matches tab', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: /círculo/i }));

    await waitFor(() => {
      expect(mockFetchWithError).toHaveBeenCalledWith('/api/matches', expect.anything());
    });
    expect(mockFetchWithError).not.toHaveBeenCalledWith('/api/pets?currentPetId=pet-1', expect.anything());
  });

  it('adds tab navigation to browser history with the active pet', async () => {
    const pushState = window.history.pushState as jest.Mock;
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: /círculo/i }));
    await user.click(screen.getByRole('button', { name: /seguir descubriendo/i }));

    expect(pushState).toHaveBeenCalled();
    const url = String(pushState.mock.calls.at(-1)?.[2] || '');
    expect(url).toContain('tab=explore');

  });
  it('changes the visible panel on a real CTA click and retains the active pet', async () => {
    window.history.replaceState(null, '', '/inicio?tab=home&petId=pet-2');
    renderShell();
    await userEvent.click(screen.getByRole('link', { name: /conocé una mascota/i }));
    expect(await screen.findByRole('heading', { name: 'Descubrir' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Inicio' })).not.toBeInTheDocument();
    expect(window.location.search).toBe('?tab=explore&petId=pet-2');
    expect(mockFetchWithError).toHaveBeenCalledTimes(1);
  });

  it('ignores a late response for a previously selected pet', async () => {
    let resolveFirst!: (value: unknown) => void;
    mockFetchWithError.mockImplementation((url: string) => url.endsWith('pet-1')
      ? new Promise((resolve) => { resolveFirst = resolve; })
      : Promise.resolve({ success: true, data: { pets: [createPet('candidate-2', 'Candidata Luna')] } }));
    window.history.replaceState(null, '', '/inicio?tab=explore&petId=pet-1');
    renderShell();
    act(() => window.history.pushState(null, '', '/inicio?tab=explore&petId=pet-2'));
    expect(await screen.findByRole('heading', { name: /Candidata Luna/ })).toBeVisible();
    await act(async () => resolveFirst({ success: true, data: { pets: [createPet('candidate-1', 'Candidato anterior')] } }));
    expect(screen.queryByRole('heading', { name: /Candidato anterior/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Candidata Luna/ })).toBeVisible();
  });

  it('updates the no-pet screen when navigation changes and handles invalid tabs', () => {
    render(<NoPetsHome />);
    act(() => window.history.pushState(null, '', '/inicio?tab=explore'));
    expect(screen.getByRole('heading', { name: 'Creá una mascota para empezar a descubrir' })).toBeVisible();
    act(() => window.history.pushState(null, '', '/inicio?tab=invalid'));
    expect(screen.getByRole('heading', { name: 'También podés crear el perfil de tu mascota' })).toBeVisible();
  });

  it('clears a named recommendation after discovery confirms an empty list', async () => {
    renderShell({ initialSuggestions: [{ id: 'mishi', name: 'Mishi', petType: 'cat', breed: null, image: null, matchScore: 1, matchReason: '' }] });
    await userEvent.click(screen.getByRole('link', { name: /Conocé a Mishi/ }));
    await screen.findByRole('heading', { name: 'Ya conociste a todos por aquí' });
    act(() => window.history.pushState(null, '', '/inicio?tab=home&petId=pet-1'));
    expect(screen.queryByText('Conocé a Mishi')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Conocé una mascota/ })).toBeVisible();
  });

  it('uses the latest discovered candidate for the selected pet on returning home', async () => {
    mockFetchWithError.mockResolvedValue({ success: true, data: { pets: [createPet('next', 'Mora')] } });
    window.history.replaceState(null, '', '/inicio?tab=explore&petId=pet-2');
    renderShell();
    await screen.findByRole('heading', { name: /Mora/ });
    act(() => window.history.pushState(null, '', '/inicio?tab=home&petId=pet-2'));
    expect(screen.getByRole('link', { name: /Conocé a Mora/ })).toHaveAttribute('href', '/inicio?tab=explore&petId=pet-2');
  });

});
