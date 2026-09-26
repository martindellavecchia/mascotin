import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MatchesPanel from '@/components/MatchesPanel';
import type { Pet } from '@/types';

describe('MatchesPanel', () => {
  it('shows a retryable error instead of the empty state when loading failed', async () => {
    const onRefresh = jest.fn();
    render(<MatchesPanel matches={[]} currentUserId="user-1" onRefresh={onRefresh} loadError />);

    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar tu círculo');
    expect(screen.queryByText('Todavía no hay coincidencias')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state only after a successful load with zero results', () => {
    render(<MatchesPanel matches={[]} currentUserId="user-1" onRefresh={jest.fn()} />);

    expect(screen.getByText('Todavía no hay coincidencias')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Descubrir' })).toHaveAttribute('href', '/inicio?tab=explore');
  });

  it('renders each match as a keyboard-reachable link to its chat', () => {
    const match = { id: 'pet-2', name: 'Luna', images: '[]', matchId: 'match-9' } as unknown as Pet;
    render(<MatchesPanel matches={[match]} currentUserId="user-1" onRefresh={jest.fn()} />);

    expect(screen.getByRole('link', { name: 'Abrir chat con Luna' })).toHaveAttribute(
      'href',
      '/messages?matchId=match-9'
    );
  });
});
