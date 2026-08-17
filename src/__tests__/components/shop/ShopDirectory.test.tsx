import { act, fireEvent, render, screen } from '@testing-library/react';
import ShopDirectory from '@/components/shop/ShopDirectory';
import type { PublicStoreCard } from '@/lib/server/stores';

const store: PublicStoreCard = {
  id: 'store-1',
  name: 'Paw Spa',
  slug: 'paw-spa',
  description: 'Baño y peluquería',
  address: 'Palermo',
  image: null,
  category: { id: 'cat-1', name: 'Peluquería' },
  ratingAverage: 4.8,
  reviewCount: 12,
  trust: { level: 'HIGHLY_RECOMMENDED', label: 'Muy confiable', description: '', tone: 'emerald' },
  services: [{ id: 'svc-1', name: 'Baño', price: 8000, duration: 60 }],
};

describe('ShopDirectory', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders server-provided stores without fetching on hydrate', () => {
    render(
      <ShopDirectory
        initialCategories={[{ id: 'cat-1', name: 'Peluquería' }]}
        initialStores={[store]}
      />
    );

    expect(screen.getByRole('heading', { name: 'Paw Spa' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filtrar por categoría' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filtrar por calificación' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Ordenar negocios' })).toBeInTheDocument();
    expect(screen.getByText('Publicá o administrá tu negocio')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('debounces search text and aborts stale requests', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          reject(error);
        });
        window.setTimeout(() => {
          resolve({
            json: async () => ({ success: true, stores: [] }),
          });
        }, 400);
      });
    });

    render(
      <ShopDirectory
        initialCategories={[{ id: 'cat-1', name: 'Peluquería' }]}
        initialStores={[store]}
      />
    );

    const input = screen.getByPlaceholderText(/Buscar negocio/i);
    fireEvent.change(input, { target: { value: 'vet' } });
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(250);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.change(input, { target: { value: 'veterinaria' } });
    await act(async () => {
      jest.advanceTimersByTime(250);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(400);
    });
  });

  it('shows loading, empty and error states after a filter request', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'falló' }),
    });

    render(
      <ShopDirectory
        initialCategories={[{ id: 'cat-1', name: 'Peluquería' }]}
        initialStores={[store]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Buscar negocio/i), {
      target: { value: 'x' },
    });
    await act(async () => {
      jest.advanceTimersByTime(250);
    });

    expect(await screen.findByText(/No se pudieron cargar los negocios/i)).toBeInTheDocument();

    fetchMock.mockResolvedValueOnce({
      json: async () => ({ success: true, stores: [] }),
    });
    fireEvent.change(screen.getByPlaceholderText(/Buscar negocio/i), {
      target: { value: 'otro' },
    });
    await act(async () => {
      jest.advanceTimersByTime(250);
    });

    expect(await screen.findByText(/Todavía no hay negocios con esos filtros/i)).toBeInTheDocument();
  });
});
