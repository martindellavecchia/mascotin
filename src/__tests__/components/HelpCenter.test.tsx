import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HelpCenter from '@/components/help/HelpCenter';

const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('HelpCenter', () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    (global.fetch as jest.Mock).mockImplementation((input: string) => {
      if (input === '/api/foster/profile') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, profile: null }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          createdCases: [],
          offers: [],
          fosterPlacements: [],
        }),
      });
    });
  });

  it('separa la ayuda temporal de las acciones de adopción', async () => {
    render(<HelpCenter />);

    expect(await screen.findByRole('heading', { name: 'Ayuda temporal' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Adopción definitiva' })).toBeInTheDocument();
    expect(screen.queryByText('Módulo principal de Huella')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Encontré una mascota/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ofrecer mi hogar/i })).toBeInTheDocument();

    const browseLink = screen.getByRole('link', { name: /Buscar una mascota/i });
    const publishLink = screen.getByRole('link', { name: /Publicar una mascota/i });

    expect(browseLink).toHaveAttribute('href', '/adoptions');
    expect(publishLink).toHaveAttribute('href', '/adoptions?create=listing');
    expect(await screen.findByText('Todavía no creaste solicitudes de ayuda')).toBeInTheDocument();
  });

  it('muestra el seguimiento antes de otras formas de ayudar cuando ya hay casos', async () => {
    (global.fetch as jest.Mock).mockImplementation((input: string) => Promise.resolve({
      ok: true,
      json: async () => input === '/api/foster/profile' ? { success: true, profile: null } : {
        success: true,
        createdCases: [{
          id: 'rescue-1', species: 'DOG', size: 'MEDIUM', status: 'SEARCHING',
          location: 'Córdoba', description: 'Necesita tránsito por una semana',
          images: [], needs: [], searchRadiusKm: 10, offerCount: 2, interestedCount: 1,
        }],
        offers: [], fosterPlacements: [],
      },
    }));

    render(<HelpCenter />);
    const tracking = await screen.findByRole('link', { name: 'Ver seguimiento' });
    const moreWays = screen.getByText('Ayudar de otra manera');
    expect(tracking).toHaveAttribute('href', '/hogares-de-transito/casos/rescue-1');
    expect(tracking.compareDocumentPosition(moreWays) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ofrecer mi hogar/ })).not.toBeVisible();
    await userEvent.click(moreWays);
    expect(screen.getByRole('button', { name: /Ofrecer mi hogar/ })).toBeVisible();
  });

  it('distingue un error de carga de una cuenta sin actividad y permite reintentar', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ success: false }) });
    render(<HelpCenter />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tu actividad');
    expect(screen.queryByText('Todavía no creaste solicitudes de ayuda')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Todavía no creaste solicitudes de ayuda')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
