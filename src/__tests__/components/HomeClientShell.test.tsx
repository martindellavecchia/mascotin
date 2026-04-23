import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomeClientShell from '@/components/home/HomeClientShell';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockFetchWithError = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (_loader: unknown, options?: { loading?: () => React.ReactNode }) =>
    function MockDynamicComponent() {
      return <>{options?.loading ? options.loading() : null}</>;
    },
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@/hooks/useFetchWithError', () => ({
  useFetchWithError: () => ({
    fetchWithError: mockFetchWithError,
  }),
}));

jest.mock('@/components/Header', () => ({
  __esModule: true,
  default: () => <div>Header</div>,
}));

jest.mock('@/components/DashboardLayout', () => ({
  __esModule: true,
  default: ({
    leftSidebar,
    rightSidebar,
    children,
  }: {
    leftSidebar?: React.ReactNode;
    rightSidebar?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <aside>{leftSidebar}</aside>
      <main>{children}</main>
      <aside>{rightSidebar}</aside>
    </div>
  ),
}));

jest.mock('@/components/HomeStats', () => ({
  __esModule: true,
  default: () => <div>Stats</div>,
}));

jest.mock('@/components/widgets/NextAppointment', () => ({
  __esModule: true,
  default: () => <div>Next appointment</div>,
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
      upcomingAppointments: 0,
      unreadMessages: 0,
    },
    initialNextAppointment: null,
    initialFeedPosts: [],
    initialFeedNextCursor: null,
    initialFeedHasMore: false,
  } as const;
}

describe('HomeClientShell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockReplace.mockImplementation((url: string) => {
      const nextUrl = new URL(url, 'http://localhost');
      mockSearchParams = new URLSearchParams(nextUrl.search);
    });
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

  function renderShell() {
    return render(<HomeClientShell {...buildProps()} />);
  }

  it('does not fetch matches or explore data on the initial home tab', () => {
    renderShell();

    expect(mockFetchWithError).not.toHaveBeenCalled();
  });

  it('fetches explore data only after opening the explore tab', async () => {
    const user = userEvent.setup();
    const view = renderShell();
    await user.click(screen.getByRole('button', { name: /explorar/i }));
    view.rerender(<HomeClientShell {...buildProps()} />);

    await waitFor(() => {
      expect(mockFetchWithError).toHaveBeenCalledWith('/api/pets?currentPetId=pet-1');
    });
    expect(mockFetchWithError).not.toHaveBeenCalledWith('/api/matches');
  });

  it('fetches matches only after opening the matches tab', async () => {
    const user = userEvent.setup();
    const view = renderShell();
    await user.click(screen.getByRole('button', { name: /matches/i }));
    view.rerender(<HomeClientShell {...buildProps()} />);

    await waitFor(() => {
      expect(mockFetchWithError).toHaveBeenCalledWith('/api/matches');
    });
    expect(mockFetchWithError).not.toHaveBeenCalledWith('/api/pets?currentPetId=pet-1');
  });
});
