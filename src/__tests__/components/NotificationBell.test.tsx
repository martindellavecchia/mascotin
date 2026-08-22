import { fireEvent, render, screen } from '@testing-library/react';
import NotificationBell from '@/components/notifications/NotificationBell';

const refetchUnreadCount = jest.fn().mockResolvedValue(0);
const refetchNotifications = jest.fn().mockResolvedValue([]);

jest.mock('@/hooks/useNotifications', () => ({
  useUnreadCount: () => ({
    data: 0,
    refetch: refetchUnreadCount,
  }),
  useNotifications: () => ({
    data: [],
    isLoading: false,
    refetch: refetchNotifications,
  }),
  useMarkAsRead: () => ({
    mutate: jest.fn(),
  }),
}));

describe('NotificationBell', () => {
  it.each([
    ['mobile', false],
    ['desktop', true],
  ])('renders an opaque, high-contrast notification panel on %s', async (_viewport, isDesktop) => {
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
});
