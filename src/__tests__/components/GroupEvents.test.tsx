import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GroupEvents from '@/components/groups/GroupEvents';

jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

describe('group event attendance', () => {
  it.each([true, false])('shows a read-only past event when attending=%s', async (isAttending) => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, events: [{
      id: 'past', title: 'Encuentro anterior', date: '2020-01-01T12:00:00Z', location: 'Parque',
      description: '', image: null, authorId: 'host', author: { id: 'host', name: 'Host', image: null },
      isAttending, attendeesCount: 3,
    }] }) });
    render(<GroupEvents groupId="group" currentUserId="viewer" isMember isCreator={false} />);
    const action = await screen.findByRole('button', { name: 'Finalizado' });
    expect(action).toBeDisabled();
    expect(action).toHaveAttribute('aria-pressed', String(isAttending));
    await userEvent.click(action);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByText('3 asistentes')).toBeVisible();
  });
});
