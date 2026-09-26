import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatWindow from '@/components/messages/ChatWindow';

const mockFetchWithError = jest.fn();
const mockAbort = jest.fn();

jest.mock('@/hooks/useFetchWithError', () => ({
  useFetchWithError: () => ({
    fetchWithError: mockFetchWithError,
    abort: mockAbort,
  }),
}));

jest.mock('@/hooks/useAdaptivePolling', () => ({
  useAdaptivePolling: () => ({ markActivity: jest.fn() }),
}));

jest.mock('@/components/messages/MeetupPanel', () => ({
  __esModule: true,
  default: () => null,
}));

const otherPet = { id: 'pet-2', matchId: 'match-1', name: 'Luna', images: '[]' };

function page(messages: unknown[], extra: Record<string, unknown> = {}) {
  return {
    success: true,
    data: { messages, latestCursor: null, hasMoreBefore: false, markedRead: 0, lastSeenAt: null, ...extra },
  };
}

describe('ChatWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a retryable load error instead of the empty conversation state', async () => {
    mockFetchWithError
      .mockResolvedValueOnce({ success: false, error: 'Error de conexión' })
      .mockResolvedValueOnce(
        page([{ id: 'm1', senderId: 'user-2', content: 'Hola', read: false, createdAt: '2026-04-22T10:00:00.000Z' }])
      );

    render(<ChatWindow matchId="match-1" currentUserId="user-1" otherPet={otherPet} />);

    expect(await screen.findByText('No pudimos cargar esta conversación')).toBeInTheDocument();
    expect(screen.queryByText('Enviá el primer mensaje')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Hola')).toBeInTheDocument();
    expect(mockFetchWithError).toHaveBeenCalledTimes(2);
  });

  it('reports read messages and distinguishes sent from seen receipts', async () => {
    const onMessagesRead = jest.fn();
    mockFetchWithError.mockResolvedValueOnce(
      page(
        [
          { id: 'm1', senderId: 'user-1', content: 'Primero', read: true, createdAt: '2026-04-22T10:00:00.000Z' },
          { id: 'm2', senderId: 'user-1', content: 'Segundo', read: false, createdAt: '2026-04-22T10:01:00.000Z' },
        ],
        { markedRead: 2 }
      )
    );

    render(
      <ChatWindow matchId="match-1" currentUserId="user-1" otherPet={otherPet} onMessagesRead={onMessagesRead} />
    );

    expect(await screen.findByText('Primero')).toBeInTheDocument();
    expect(onMessagesRead).toHaveBeenCalledWith('match-1');
    expect(screen.getByText('Visto')).toBeInTheDocument();
    expect(screen.getByText('Enviado')).toBeInTheDocument();
  });

  it('keeps a failed message with a retry action', async () => {
    mockFetchWithError
      .mockResolvedValueOnce(page([]))
      .mockResolvedValueOnce({ success: false, error: 'No pudimos enviar el mensaje. Reintentá.' })
      .mockResolvedValueOnce({
        success: true,
        data: {
          message: { id: 'm9', senderId: 'user-1', content: 'Hola Luna', read: false, createdAt: '2026-04-22T10:05:00.000Z' },
        },
      });

    render(<ChatWindow matchId="match-1" currentUserId="user-1" otherPet={otherPet} />);

    await userEvent.type(await screen.findByLabelText('Mensaje'), 'Hola Luna');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }));

    expect(await screen.findByText('No se envió.')).toBeInTheDocument();
    expect(screen.getByText('Hola Luna')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(screen.queryByText('No se envió.')).not.toBeInTheDocument());
    expect(screen.getByText('Hola Luna')).toBeInTheDocument();
    expect(screen.getByText('Enviado')).toBeInTheDocument();
  });
});
