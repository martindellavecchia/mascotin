import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExploreTab from '@/components/home/ExploreTab';
import type { Pet } from '@/types';

jest.mock('@/components/PetCard', () => ({
  __esModule: true,
  default: ({ onLike, actionsDisabled }: { onLike: () => void; actionsDisabled: boolean }) => (
    <button onClick={onLike} disabled={actionsDisabled}>
      Conectar con Mora
    </button>
  ),
}));

it('permite reintentar la misma tarjeta cuando no se guardó la decisión', async () => {
  const onLike = jest.fn().mockResolvedValue(undefined);
  render(
    <ExploreTab
      petsToSwipe={[{ id: 'pet', name: 'Mora' } as Pet]}
      currentIndex={0}
      loading={false}
      onReload={jest.fn()}
      onLike={onLike}
      onPass={jest.fn()}
    />
  );
  await userEvent.click(screen.getByRole('button', { name: 'Conectar con Mora' }));
  expect(screen.getByRole('button', { name: 'Conectar con Mora' })).toBeDisabled();
  await waitFor(() => expect(onLike).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Conectar con Mora' })).toBeEnabled()
  );
  await userEvent.click(screen.getByRole('button', { name: 'Conectar con Mora' }));
  await waitFor(() => expect(onLike).toHaveBeenCalledTimes(2));
});

it('muestra un error con reintento distinto del mazo vacío cuando falla la carga', async () => {
  const onReload = jest.fn();
  render(
    <ExploreTab
      petsToSwipe={[]}
      currentIndex={0}
      loading={false}
      error
      onReload={onReload}
      onLike={jest.fn()}
      onPass={jest.fn()}
    />
  );

  expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar mascotas');
  expect(screen.queryByText('Ya conociste a todos por aquí')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(onReload).toHaveBeenCalledTimes(1);
});

it('usa las flechas del teclado para pasar o conectar, salvo mientras se escribe', async () => {
  const onLike = jest.fn().mockResolvedValue(undefined);
  const onPass = jest.fn().mockResolvedValue(undefined);
  render(
    <>
      <input aria-label="Buscar" />
      <ExploreTab
        petsToSwipe={[{ id: 'pet', name: 'Mora' } as Pet]}
        currentIndex={0}
        loading={false}
        onReload={jest.fn()}
        onLike={onLike}
        onPass={onPass}
      />
    </>
  );

  fireEvent.keyDown(screen.getByLabelText('Buscar'), { key: 'ArrowRight' });
  await new Promise((resolve) => setTimeout(resolve, 300));
  expect(onLike).not.toHaveBeenCalled();

  fireEvent.keyDown(document.body, { key: 'ArrowRight' });
  await waitFor(() => expect(onLike).toHaveBeenCalledTimes(1));

  fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
  await waitFor(() => expect(onPass).toHaveBeenCalledTimes(1));
});
