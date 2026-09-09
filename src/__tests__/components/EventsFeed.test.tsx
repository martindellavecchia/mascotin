import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EventsFeed from '@/components/community/EventsFeed';

jest.mock('next-auth/react', () => {
  const session = { user: { id: 'reader', name: 'Ana' } };
  return { useSession: () => ({ data: session }) };
});
jest.mock('@/components/community/CreatePostCard', () => ({ __esModule: true, default: () => <div>Crear publicación</div> }));
jest.mock('@/components/community/EditPostModal', () => ({ __esModule: true, default: () => null }));

const post = {
  id: 'post-1', authorId: 'author', author: { id: 'author', name: 'Lucía', image: null },
  content: 'Una pregunta de la comunidad', postType: 'question', images: '[]',
  createdAt: '2026-09-01T12:00:00Z', updatedAt: '2026-09-01T12:00:00Z',
  _count: { likes: 0, comments: 0 }, isLiked: false,
};
const response = (data: unknown) => ({ ok: true, json: async () => data });
function renderFeed() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60_000 } } });
  return render(<QueryClientProvider client={client}><EventsFeed /></QueryClientProvider>);
}

describe('EventsFeed', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/community');
    (global.fetch as jest.Mock).mockReset().mockImplementation((url: string) => {
      if (url.startsWith('/api/posts?')) return Promise.resolve(response({ posts: [post] }));
      return Promise.resolve(response({ success: true, owner: { location: 'Córdoba' }, pets: [] }));
    });
  });

  it('shows an error with retry instead of treating a failed request as an empty feed', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      let failPosts = true;
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.startsWith('/api/posts?')) {
          if (failPosts) {
            failPosts = false;
            return Promise.reject(new Error('Network failure'));
          }
          return Promise.resolve(response({ posts: [post] }));
        }
        return Promise.resolve(response({ success: true, owner: null, pets: [] }));
      });
      renderFeed();
      expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las publicaciones');
      expect(screen.queryByText('No hay publicaciones aún')).not.toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Filtrar publicaciones' })).toBeVisible();
      await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
      expect(await screen.findByText(post.content)).toBeVisible();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('sends a single like request and keeps the card visible while refreshing', async () => {
    renderFeed();
    await screen.findByText(post.content);
    await userEvent.click(screen.getByRole('button', { name: 'Me gusta' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/posts/post-1/like', { method: 'POST' }));
    expect((global.fetch as jest.Mock).mock.calls.filter(([url]) => url === '/api/posts/post-1/like')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Quitar me gusta' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(post.content)).toBeVisible();
    expect(screen.queryByText('Cargando publicaciones')).not.toBeInTheDocument();
  });

  it('keeps the last selected filter when an older request finishes later', async () => {
    let resolveQuestion: (value: ReturnType<typeof response>) => void = () => {};
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('postType=question')) return new Promise(resolve => { resolveQuestion = resolve; });
      if (url.includes('postType=event')) return Promise.resolve(response({ posts: [{ ...post, id: 'event-1', postType: 'event', content: 'Paseo del sábado' }] }));
      if (url.startsWith('/api/posts?')) return Promise.resolve(response({ posts: [post] }));
      return Promise.resolve(response({ success: true, owner: null, pets: [] }));
    });
    renderFeed();
    await screen.findByText(post.content);
    await userEvent.click(screen.getByRole('button', { name: 'Preguntas' }));
    await userEvent.click(screen.getByRole('button', { name: 'Eventos' }));
    expect(await screen.findByText('Paseo del sábado')).toBeVisible();
    await act(async () => resolveQuestion(response({ posts: [post] })));
    expect(screen.queryByText(post.content)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eventos' })).toHaveAttribute('aria-pressed', 'true');
  });
});
