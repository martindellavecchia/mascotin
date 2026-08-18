import { render, screen } from '@testing-library/react';
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

    expect(screen.getByRole('heading', { name: 'Ayuda temporal' })).toBeInTheDocument();
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
});
