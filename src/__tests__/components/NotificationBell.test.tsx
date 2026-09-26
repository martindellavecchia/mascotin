import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import NotificationBell from '@/components/notifications/NotificationBell';

const refetchUnreadCount = jest.fn().mockResolvedValue(0);
const refetchNotifications = jest.fn().mockResolvedValue([]);
const mockMutate = jest.fn();
let mockUnreadCount = 0;
let mockNotificationsError = false;

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/hooks/useNotifications', () => ({
  useUnreadCount: () => ({
    data: mockUnreadCount,
    refetch: refetchUnreadCount,
  }),
  useNotifications: () => ({
    data: [],
    isLoading: false,
    isError: mockNotificationsError,
    refetch: refetchNotifications,
  }),
  useMarkAsRead: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

function mockViewport(isDesktop: boolean) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: query === '(min-width: 1024px)' ? isDesktop : false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

describe('NotificationBell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnreadCount = 0;
    mockNotificationsError = false;
    mockViewport(false);
  });

  it.each([
    ['mobile', false],
    ['desktop', true],
  ])('renders an opaque, high-contrast notification panel on %s', async (_viewport, isDesktop) => {
    mockViewport(isDesktop);

    render(<NotificationBell />);

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }));

    const panel = await screen.findByRole('dialog');
    expect(panel).toHaveClass(
      'bg-popover',
      'border-border',
      'text-popover-foreground',
      'shadow-xl'
    );
    expect(screen.getByText('Todavía no tenés notificaciones').parentElement).toHaveClass(
      'text-slate-600'
    );
  });

  it('announces the unread count in the trigger label', () => {
    mockUnreadCount = 3;
    render(<NotificationBell />);

    expect(screen.getByRole('button', { name: 'Notificaciones, 3 sin leer' })).toBeInTheDocument();
  });

  it('shows a retryable error instead of the empty state when the list fails', async () => {
    mockNotificationsError = true;
    render(<NotificationBell />);

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }));

    expect(await screen.findByText('No pudimos cargar tus notificaciones.')).toBeInTheDocument();
    expect(screen.queryByText('Todavía no tenés notificaciones')).not.toBeInTheDocument();
    refetchNotifications.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetchNotifications).toHaveBeenCalledTimes(1);
  });

  it('toasts in Spanish when marking everything as read fails', async () => {
    mockUnreadCount = 2;
    mockMutate.mockRejectedValueOnce(new Error('500'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<NotificationBell />);

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones, 2 sin leer' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar todo como leído' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'No pudimos marcar las notificaciones como leídas. Reintentá.'
      )
    );
  });
});
