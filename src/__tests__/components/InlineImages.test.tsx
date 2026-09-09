import { render, screen } from '@testing-library/react';
import ConversationList from '@/components/messages/ConversationList';
import PostCard from '@/components/feed/PostCard';
import { withImageFields } from '@/lib/media';

jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AvatarImage: ({ src }: { src?: string }) => src ? <img src={src} alt="Avatar" /> : null,
}));

const image = 'data:image/webp;base64,YWJj';

describe('inline image payloads', () => {
  it('keeps the chosen conversation thumbnail after removing duplicate fields', () => {
    const match = withImageFields({
      id: 'pet-1', matchId: 'match-1', name: 'Mora',
      images: JSON.stringify(['/images/first.jpg', image]), thumbnailIndex: 1,
    });
    render(<ConversationList matches={[match]} groups={[]} selectedId={null} selectedType={null} onSelect={jest.fn()} />);
    expect(screen.getByAltText('Avatar')).toHaveAttribute('src', image);
  });

  it('displays post photos from the canonical images field', () => {
    const post = withImageFields({
      id: 'post-1', authorId: 'author-1', content: 'Un paseo con Mora', images: JSON.stringify([image]),
      author: { id: 'author-1', name: 'Ana', image: null },
      createdAt: '2026-09-01T12:00:00Z', updatedAt: '2026-09-01T12:00:00Z',
    });
    const { container } = render(<PostCard post={post} currentUserId="viewer" />);
    expect(container.querySelector(`img[src="${image}"]`)).toBeInTheDocument();
  });
});
