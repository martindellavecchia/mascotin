import { act, render, screen, waitFor } from '@testing-library/react';
import FosterChat from '@/components/help/FosterChat';

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

const message = (id: string, content: string) => ({ id, senderId: 'other', content, createdAt: '2026-11-20T15:00:00Z' });
const response = (messages: unknown[]) => ({
  ok: true,
  json: async () => ({ success: true, messages, conversation: { status: 'ACTIVE', canWrite: true } }),
});

describe('FosterChat', () => {
  let scrollTo: jest.Mock;
  let scrollIntoView: jest.Mock;
  let poll: () => void;

  beforeEach(() => {
    scrollTo = jest.fn();
    scrollIntoView = jest.fn();
    Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;
    Element.prototype.scrollIntoView = scrollIntoView;
    const realSetInterval = window.setInterval.bind(window);
    jest.spyOn(window, 'setInterval').mockImplementation(((callback: () => void, delay?: number) => {
      if (delay !== 15_000) return realSetInterval(callback, delay);
      poll = callback;
      return 0;
    }) as unknown as typeof window.setInterval);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('scrolls only its own list, and only when a new message arrives', async () => {
    (global.fetch as jest.Mock)
      .mockReset()
      .mockResolvedValueOnce(response([message('m1', 'Hola')]))
      .mockResolvedValueOnce(response([message('m1', 'Hola')]))
      .mockResolvedValueOnce(response([message('m1', 'Hola'), message('m2', '¿Cuándo la retiro?')]));

    render(<FosterChat fosterOfferId="offer-1" currentUserId="me" enabled />);

    await screen.findByText('Hola');
    expect(scrollTo).toHaveBeenCalledTimes(1);

    await act(async () => poll());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(scrollTo).toHaveBeenCalledTimes(1);

    await act(async () => poll());
    await screen.findByText('¿Cuándo la retiro?');
    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
