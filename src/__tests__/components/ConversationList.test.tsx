import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConversationList from '@/components/messages/ConversationList';

describe('ConversationList empty states', () => {
  it('sends an empty match inbox to Descubrir', () => {
    render(
      <ConversationList
        matches={[]}
        groups={[]}
        selectedId={null}
        selectedType={null}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByText('Todavía no tenés encuentros.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Descubrir' })).toHaveAttribute(
      'href',
      '/inicio?tab=explore'
    );
  });

  it('sends an empty group inbox to the group directory', async () => {
    const user = userEvent.setup();
    render(
      <ConversationList
        matches={[]}
        groups={[]}
        selectedId={null}
        selectedType={null}
        onSelect={jest.fn()}
      />
    );

    await user.click(screen.getByRole('tab', { name: 'Grupos' }));

    expect(screen.getByText('Todavía no pertenecés a ningún grupo.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explorar grupos' })).toHaveAttribute(
      'href',
      '/community/groups'
    );
  });
});
