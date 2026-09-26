import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

describe('ConfirmDialog', () => {
  it('no ejecuta la acción hasta confirmar', async () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmDialog
        title="¿Eliminar publicación?"
        confirmLabel="Eliminar"
        destructive
        onConfirm={onConfirm}
        trigger={<Button>Eliminar</Button>}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cierra al confirmar con éxito', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(<ConfirmDialog title="¿Salir del grupo?" onConfirm={onConfirm} trigger={<Button>Salir</Button>} />);

    await userEvent.click(screen.getByRole('button', { name: 'Salir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('permanece abierto cuando la acción devuelve false', async () => {
    const onConfirm = jest.fn().mockResolvedValue(false);
    render(<ConfirmDialog title="¿Cancelar turno?" onConfirm={onConfirm} trigger={<Button>Cancelar turno</Button>} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar turno' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});
