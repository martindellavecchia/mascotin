import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import PostCard from '@/components/feed/PostCard';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string }) => <span role="img" aria-label={props.alt} />,
}));

type PostInput = ComponentProps<typeof PostCard>['post'];

function rescuePost(overrides: Record<string, unknown> = {}): PostInput {
  return {
    id: 'post-1',
    authorId: 'creator-1',
    content: 'Necesita ayuda cerca de tu zona.',
    images: [],
    createdAt: new Date('2026-08-17T12:00:00.000Z'),
    updatedAt: new Date('2026-08-17T12:00:00.000Z'),
    postType: 'foster_case',
    author: { id: 'foster-module', name: 'Hogares de tránsito', image: null },
    rescueCase: {
      id: 'case-1', status: 'SEARCHING', species: 'dog', size: 'medium', urgency: 'HIGH', requestedDays: 7,
      primaryNeed: 'FOSTER', openNeedTypes: ['FOSTER', 'TRANSPORT'], additionalNeeds: [{ type: 'TRANSPORT', status: 'OPEN' }], adoptionListingId: null,
    },
    _count: { likes: 0, comments: 0 },
    ...overrides,
  } as unknown as PostInput;
}

describe('wall rescue contact CTA', () => {
  it('opens the primary foster need directly from the wall', () => {
    render(<PostCard post={rescuePost()} currentUserId="viewer-1" />);

    expect(screen.getByRole('link', { name: 'Ofrecer tránsito' })).toHaveAttribute(
      'href', '/hogares-de-transito/casos/case-1?contact=1&need=FOSTER',
    );
  });

  it('uses the first open operational need when the primary need is no longer open', () => {
    render(<PostCard post={rescuePost({
      rescueCase: {
        id: 'case-1', status: 'ASSISTANCE_ACTIVE', species: 'dog', size: 'medium', urgency: 'HIGH', requestedDays: 7,
        primaryNeed: 'FOSTER', openNeedTypes: ['TRANSPORT'], additionalNeeds: [{ type: 'TRANSPORT', status: 'OPEN' }], adoptionListingId: null,
      },
    })} currentUserId="viewer-1" />);

    expect(screen.getByRole('link', { name: 'Ayudar con el traslado' })).toHaveAttribute(
      'href', '/hogares-de-transito/casos/case-1?contact=1&need=TRANSPORT',
    );
  });

  it('keeps adoption as the contextual priority when a listing is open', () => {
    render(<PostCard post={rescuePost({
      rescueCase: {
        id: 'case-1', status: 'NEEDS_ADOPTION', species: 'dog', size: 'medium', urgency: 'NORMAL', requestedDays: 7,
        primaryNeed: 'FOSTER', openNeedTypes: [], additionalNeeds: [], adoptionListingId: 'listing-1',
      },
    })} currentUserId="viewer-1" />);

    expect(screen.getByRole('link', { name: 'Ver adopción' })).toHaveAttribute('href', '/adoptions/listing-1');
  });
});
