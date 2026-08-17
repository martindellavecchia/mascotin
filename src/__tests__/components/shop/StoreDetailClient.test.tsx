import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StoreDetailView from '@/components/shop/StoreDetailView';
import type { PublicStoreDetail } from '@/lib/server/stores';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

const store: PublicStoreDetail = {
  id: 'store-1',
  name: 'Paw Spa',
  slug: 'paw-spa',
  description: 'Baño y peluquería',
  address: 'Palermo',
  image: null,
  images: [],
  tags: [],
  category: { id: 'cat-1', name: 'Peluquería' },
  ratingAverage: 4.8,
  reviewCount: 1,
  trust: { level: 'HIGHLY_RECOMMENDED', label: 'Muy confiable', description: '', tone: 'emerald' },
  services: [{ id: 'svc-1', name: 'Baño', description: 'Baño completo', price: 8000, duration: 60 }],
  reviews: [],
};

function mockViewer(data: Record<string, unknown>) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url === '/api/stores/paw-spa/viewer') {
      return Promise.resolve({
        status: 200,
        json: async () => ({ success: true, data }),
      });
    }
    if (url === '/api/pet/mine') {
      return Promise.resolve({
        status: 200,
        json: async () => ({ success: true, pets: [{ id: 'pet-1', name: 'Luna' }] }),
      });
    }
    return Promise.resolve({
      status: 200,
      json: async () => ({ success: true }),
    });
  });
}

describe('StoreDetailView islands', () => {
  it('renders server store content and loads viewer once without requesting pets', async () => {
    mockViewer({
      isAuthenticated: false,
      isOwner: false,
      reviewEligibility: 'unauthenticated',
      ownReviewId: null,
      ownReview: null,
      helpfulReviewIds: [],
    });

    render(<StoreDetailView store={store} />);

    expect(screen.getByRole('heading', { name: 'Paw Spa' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Baño' })).toBeInTheDocument();
    expect(screen.getByText('Tu experiencia')).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/stores/paw-spa/viewer');
    });

    const viewerCalls = (global.fetch as jest.Mock).mock.calls.filter(
      ([url]) => url === '/api/stores/paw-spa/viewer'
    );
    expect(viewerCalls).toHaveLength(1);
    expect(global.fetch).not.toHaveBeenCalledWith('/api/pet/mine');
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute(
      'href',
      '/login?callbackUrl=%2Fshop%2Fpaw-spa'
    );
  });

  it('loads pets only when opening booking while authenticated', async () => {
    mockViewer({
      isAuthenticated: true,
      isOwner: false,
      reviewEligibility: 'eligible',
      ownReviewId: null,
      ownReview: null,
      helpfulReviewIds: [],
    });

    render(<StoreDetailView store={store} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/stores/paw-spa/viewer');
    });
    expect(global.fetch).not.toHaveBeenCalledWith('/api/pet/mine');

    fireEvent.click(screen.getByRole('button', { name: 'Reservar' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/pet/mine');
    });
    expect(await screen.findByText('Reservar cita')).toBeInTheDocument();
  });
});
