import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommunityEventsPage from '@/app/(main)/community/events/page';

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'viewer-1' } }, status: 'authenticated' }),
}));

jest.mock('@/components/community/CommunityLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const now = new Date();
const firstDay = new Date(now.getFullYear(), now.getMonth(), 10, 12, 0);
const secondDay = new Date(now.getFullYear(), now.getMonth(), 20, 12, 0);

const events = [
  { id: 'event-1', title: 'Paseo por la costanera', description: 'Traé agua', date: firstDay.toISOString(), location: 'Costanera', attendeesCount: 2, isAttending: false },
  { id: 'event-2', title: 'Feria de adopción', description: 'Vení con tu familia', date: secondDay.toISOString(), location: 'Plaza', attendeesCount: 5, isAttending: false },
];

function dayButton(container: HTMLElement, date: Date) {
  const button = container.querySelector<HTMLButtonElement>(`button[data-day="${date.toLocaleDateString()}"]`);
  if (!button) throw new Error(`No calendar button for ${date.toDateString()}`);
  return button;
}

describe('CommunityEventsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, events }),
    });
  });

  it('shows every event until a day is selected', async () => {
    render(<CommunityEventsPage />);

    expect(await screen.findByText('Paseo por la costanera')).toBeInTheDocument();
    expect(screen.getByText('Feria de adopción')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver todos' })).not.toBeInTheDocument();
  });

  it('filters the list to the selected calendar day and can clear the filter', async () => {
    const { container } = render(<CommunityEventsPage />);
    await screen.findByText('Paseo por la costanera');

    await userEvent.click(dayButton(container, firstDay));

    expect(screen.getByText('Paseo por la costanera')).toBeInTheDocument();
    expect(screen.queryByText('Feria de adopción')).not.toBeInTheDocument();
    expect(screen.getByText(/^Eventos del/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ver todos' }));

    expect(screen.getByText('Paseo por la costanera')).toBeInTheDocument();
    expect(screen.getByText('Feria de adopción')).toBeInTheDocument();
  });

  it('shows an empty state for a day without events', async () => {
    const { container } = render(<CommunityEventsPage />);
    await screen.findByText('Paseo por la costanera');

    await userEvent.click(dayButton(container, new Date(now.getFullYear(), now.getMonth(), 15)));

    expect(screen.getByText('No hay eventos para este día')).toBeInTheDocument();
    expect(screen.queryByText('Paseo por la costanera')).not.toBeInTheDocument();
  });

  it('requests past events when switching to Pasados', async () => {
    render(<CommunityEventsPage />);
    await screen.findByText('Paseo por la costanera');

    await userEvent.click(screen.getByRole('button', { name: 'Pasados' }));

    expect(global.fetch).toHaveBeenLastCalledWith(expect.stringContaining('action=past'));
  });

  it('keeps past attendance as history and disables actions for both event types', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true, events: [
      { ...events[0], date: '2020-01-01T12:00:00Z', isAttending: true, group: { id: 'group', name: 'Grupo' } },
      { ...events[1], date: '2020-01-01T12:00:00Z', isAttending: false },
    ] }) });
    render(<CommunityEventsPage />);
    const buttons = await screen.findAllByRole('button', { name: 'Finalizado' });
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button).toBeDisabled();
      await userEvent.click(button);
    }
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByText('2 asistentes')).toBeVisible();
  });
});
