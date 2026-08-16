import { render, screen } from '@testing-library/react';
import AdoptionsPage from '@/app/(main)/adoptions/page';

let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('AdoptionsPage', () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams('create=listing');
    (global.fetch as jest.Mock).mockImplementation((input: string) => {
      if (input === '/api/adoptions') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, listings: [] }),
        });
      }

      if (input === '/api/adoptions/profile') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, profile: null }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({ pets: [] }),
      });
    });
  });

  it('abre directamente el formulario cuando recibe la intención de publicar', async () => {
    render(<AdoptionsPage />);

    expect(screen.getByPlaceholderText('Carácter')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Necesidades especiales')).toBeInTheDocument();
    expect(await screen.findByText('Todavía no hay fichas de adopción')).toBeInTheDocument();
  });
});
