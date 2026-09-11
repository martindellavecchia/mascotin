import { render, screen, waitFor } from '@testing-library/react';
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
