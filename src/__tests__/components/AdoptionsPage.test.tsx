import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdoptionsPage from '@/app/(main)/adoptions/page';

let mockSearchParams = new URLSearchParams();
jest.mock('@/components/searches/SaveSearchButton', () => ({ __esModule: true, default: () => null }));

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

  it('no asume vivienda ni experiencia y enfoca el primer dato pendiente', async () => {
    render(<AdoptionsPage />);
    await screen.findByText('Todavía no hay fichas de adopción');
    await userEvent.click(screen.getByRole('button', { name: 'Perfil adoptante' }));
    expect(screen.getByRole('combobox', { name: 'Tipo de vivienda' })).toHaveTextContent('Elegí tu tipo de vivienda');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Elegí el tipo de vivienda');
    expect(screen.getByRole('combobox', { name: 'Tipo de vivienda' })).toHaveFocus();
    expect(global.fetch).not.toHaveBeenCalledWith('/api/adoptions/profile', expect.objectContaining({ method: 'PUT' }));
  });
});
