import { render, screen, waitFor } from '@testing-library/react';
import StoreDetailClient from '@/components/shop/StoreDetailClient';
import type { PublicStoreDetail } from '@/lib/server/stores';

const store: PublicStoreDetail = {
  id: 'store-1',
  name: 'Paw Spa',
  slug: 'paw-spa',
  description: 'Baño y peluquería',
  phone: null,
  email: null,
  address: 'Palermo',
  image: null,
  images: [],
  tags: [],
  providerId: 'owner-1',
  category: { id: 'cat-1', name: 'Peluquería' },
  owner: { id: 'owner-1', name: 'Ana', image: null },
  ratingAverage: 4.8,
  reviewCount: 1,
  trust: { label: 'Muy confiable', description: '', tone: 'emerald' },
  services: [{ id: 'svc-1', name: 'Baño', description: 'Baño completo', price: 8000, duration: 60 }],
  reviews: [],
};

describe('StoreDetailClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          isAuthenticated: false,
          isOwner: false,
          reviewEligibility: 'unauthenticated',
          ownReviewId: null,
          ownReview: null,
          helpfulReviewIds: [],
        },
      }),
    });
  });

  it('renders server store content and loads viewer without requesting pets', async () => {
    render(<StoreDetailClient store={store} />);

    expect(screen.getByRole('heading', { name: 'Paw Spa' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Baño' })).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/stores/paw-spa/viewer');
    });
    expect(global.fetch).not.toHaveBeenCalledWith('/api/pet/mine');
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute(
      'href',
      '/login?callbackUrl=%2Fshop%2Fpaw-spa'
    );
  });
});
