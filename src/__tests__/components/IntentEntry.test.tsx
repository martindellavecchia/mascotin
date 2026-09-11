import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IntentEntry from '@/components/home/IntentEntry';
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
describe('entrada por intención', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ settings: { entryIntent: null } }),
    });
  });
  it('permite adoptar sin crear una mascota y guarda la intención antes de navegar', async () => {
    render(<IntentEntry />);
    await userEvent.click(screen.getByRole('button', { name: /Quiero adoptar/ }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/adoptions'));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/settings',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ entryIntent: 'ADOPT' }) })
    );
  });
  it('conserva la pantalla y permite reintentar si guardar falla', async () => {
    (global.fetch as jest.Mock).mockImplementation((_url, options) =>
      Promise.resolve({ ok: options?.method !== 'PATCH', json: async () => ({ settings: {} }) })
    );
    render(<IntentEntry />);
    await userEvent.click(screen.getByRole('button', { name: /Buscar servicios/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar');
    expect(mockPush).not.toHaveBeenCalled();
  });
});
