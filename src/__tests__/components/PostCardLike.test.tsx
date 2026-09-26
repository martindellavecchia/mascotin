import type { ComponentProps } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import PostCard from '@/components/feed/PostCard';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string }) => <span role="img" aria-label={props.alt} />,
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

type PostInput = ComponentProps<typeof PostCard>['post'];

function generalPost(overrides: Record<string, unknown> = {}): PostInput {
  return {
    id: 'post-1',
    authorId: 'author-1',
    content: 'Paseo por la plaza',
    images: [],
    createdAt: new Date('2026-08-17T12:00:00.000Z'),
    updatedAt: new Date('2026-08-17T12:00:00.000Z'),
    postType: 'general',
    author: { id: 'author-1', name: 'Ana', image: null },
    isLiked: false,
    _count: { likes: 3, comments: 0 },
    ...overrides,
  } as unknown as PostInput;
}

function mockFetchResponse(ok: boolean, body: unknown) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    json: () => Promise.resolve(body),
  });
}

describe('PostCard like', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('keeps the optimistic like when the request succeeds', async () => {
    const onLike = jest.fn();
    mockFetchResponse(true, { success: true, liked: true });
    render(<PostCard post={generalPost()} currentUserId="viewer-1" onLike={onLike} />);

    await userEvent.click(screen.getByRole('button', { name: 'Me gusta' }));

    await waitFor(() => expect(onLike).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Quitar me gusta' })).toHaveAttribute('aria-pressed', 'true');
    expect(global.fetch).toHaveBeenCalledWith('/api/posts/post-1/like', { method: 'POST' });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('reverts the like and shows an error when the request fails', async () => {
    const onLike = jest.fn();
    mockFetchResponse(false, { success: false, error: 'No autenticado' });
    render(<PostCard post={generalPost()} currentUserId="viewer-1" onLike={onLike} />);

    await userEvent.click(screen.getByRole('button', { name: 'Me gusta' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No autenticado'));
    expect(screen.getByRole('button', { name: 'Me gusta' })).toHaveAttribute('aria-pressed', 'false');
    expect(onLike).not.toHaveBeenCalled();
  });

  it('reverts the like when the network request throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    render(<PostCard post={generalPost({ isLiked: true })} currentUserId="viewer-1" />);

    await userEvent.click(screen.getByRole('button', { name: 'Quitar me gusta' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No se pudo actualizar el me gusta'));
    expect(screen.getByRole('button', { name: 'Quitar me gusta' })).toHaveAttribute('aria-pressed', 'true');
  });
});
