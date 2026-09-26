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
  phone: null,
  email: null,
  latitude: null,
  longitude: null,
  image: null,
  images: [],
  tags: [],
  promotions: [],
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

  it('renders only the contact actions, promotions and gallery the store has', async () => {
    mockViewer({
      isAuthenticated: false,
      isOwner: false,
      reviewEligibility: 'unauthenticated',
      ownReviewId: null,
      ownReview: null,
      helpfulReviewIds: [],
    });

    const { unmount } = render(<StoreDetailView store={store} />);
    expect(screen.queryByRole('group', { name: 'Contacto del negocio' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Llamar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Escribir/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cómo llegar/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=Palermo'
    );
    expect(screen.queryByText(/Promoción vigente/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Fotos' })).not.toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/stores/paw-spa/viewer'));
    unmount();

    render(
      <StoreDetailView
        store={{
          ...store,
          phone: '+54 9 11 5555-1234',
          email: 'hola@pawspa.com',
          latitude: -34.58,
          longitude: -58.42,
          images: ['https://images.unsplash.com/photo-1.jpg'],
          promotions: [
            {
              id: 'promo-1',
              title: '20% off en baños',
              body: 'Todos los martes de septiembre.',
              startsAt: new Date('2026-09-01T03:00:00.000Z'),
              endsAt: new Date('2026-09-30T15:00:00.000Z'),
            },
          ],
        }}
      />
    );

    expect(screen.getByRole('link', { name: /Llamar/ })).toHaveAttribute('href', 'tel:+5491155551234');
    expect(screen.getByRole('link', { name: /WhatsApp/ }).getAttribute('href')).toMatch(
      /^https:\/\/wa\.me\/5491155551234/
    );
    expect(screen.getByRole('link', { name: /Escribir/ })).toHaveAttribute('href', 'mailto:hola@pawspa.com');
    expect(screen.getByRole('link', { name: /Cómo llegar/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=-34.58%2C-58.42'
    );
    expect(screen.getByText('20% off en baños')).toBeInTheDocument();
    expect(screen.getByText('Válida hasta el 30 de septiembre')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver foto 1 de 1 de Paw Spa' }));
    expect(await screen.findByRole('img', { name: 'Foto 1 de Paw Spa' })).toBeInTheDocument();
  });

  it('shows an in-dialog success state reflecting the returned booking status', async () => {
    const slot = '2026-10-05T13:00:00.000Z';
    global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/stores/paw-spa/viewer') {
        return Promise.resolve({
          status: 200,
          json: async () => ({
            success: true,
            data: {
              isAuthenticated: true,
              isOwner: false,
              reviewEligibility: 'no-completed-appointment',
              ownReviewId: null,
              ownReview: null,
              helpfulReviewIds: [],
            },
          }),
        });
      }
      if (url === '/api/pet/mine') {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: async () => ({ success: true, pets: [{ id: 'pet-1', name: 'Luna' }] }),
        });
      }
      if (url.startsWith('/api/services/svc-1/availability')) {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: async () => ({ slots: [slot], timeZone: 'America/Argentina/Buenos_Aires', configured: true }),
        });
      }
      if (url === '/api/appointments' && init?.method === 'POST') {
        return Promise.resolve({
          status: 201,
          ok: true,
          json: async () => ({ success: true, appointment: { status: 'PENDING', date: slot } }),
        });
      }
      return Promise.resolve({ status: 200, json: async () => ({ success: true }) });
    });

    render(<StoreDetailView store={store} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/stores/paw-spa/viewer'));
    expect(await screen.findByText(/Podrás calificar cuando el negocio/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reservar' }));

    expect(await screen.findByText('Horarios en hora de Argentina')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Horario disponible'), { target: { value: slot } });
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar reserva' }));

    expect(await screen.findByText('Solicitud enviada')).toBeInTheDocument();
    expect(screen.getByText('El comercio debe confirmarla. Te vamos a avisar cuando responda.')).toBeInTheDocument();
    expect(screen.getByText(/lunes, 5 de octubre/)).toBeInTheDocument();
    expect(screen.getByText('Horario en hora de Argentina')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mis turnos' })).toHaveAttribute('href', '/appointments');
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
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
    expect(await screen.findByText('¿Cómo fue el servicio?')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalledWith('/api/pet/mine');

    fireEvent.click(screen.getByRole('button', { name: 'Reservar' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/pet/mine');
    });
    expect(await screen.findByText('Reservar cita')).toBeInTheDocument();
  });
});
