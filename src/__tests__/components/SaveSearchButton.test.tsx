import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SaveSearchButton from '@/components/searches/SaveSearchButton';
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
it('guarda filtros y consentimiento push sin enviar el formulario de búsqueda padre', async () => {
  const submit = jest.fn((e) => e.preventDefault());
  (global.fetch as jest.Mock).mockImplementation((url) =>
    Promise.resolve({
      ok: true,
      json: async () =>
        url === '/api/product-features' ? { savedSearches: true } : { success: true },
    })
  );
  render(
    <form onSubmit={submit}>
      <SaveSearchButton kind="ADOPTION" filters={{ species: 'dog', zone: 'Palermo' }} />
    </form>
  );
  await userEvent.click(await screen.findByRole('button', { name: 'Guardar búsqueda' }));
  expect(submit).not.toHaveBeenCalled();
  await userEvent.type(screen.getByLabelText('Nombre de la búsqueda'), 'Perros de Palermo');
  await userEvent.click(screen.getAllByRole('button', { name: 'Guardar búsqueda' }).at(-1)!);
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/saved-searches'));
  const request = (global.fetch as jest.Mock).mock.calls.find(
    ([url]) => url === '/api/saved-searches'
  );
  expect(JSON.parse(request[1].body)).toMatchObject({
    kind: 'ADOPTION',
    filters: { species: 'dog', zone: 'Palermo' },
    pushEnabled: false,
  });
});
