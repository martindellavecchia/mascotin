import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import PublicHeader from '@/components/PublicHeader';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/'),
  useSearchParams: () => new URLSearchParams(),
}));

describe('PublicHeader', () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/');
  });

  async function renderHeader() {
    await act(async () => {
      render(<PublicHeader />);
    });
  }

  it('offers clear visitor actions without the private app and map shortcuts', async () => {
    await renderHeader();

    expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: 'Servicios' })).toHaveAttribute('href', '/shop');
    expect(screen.queryByRole('link', { name: 'Ir a la app' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mapa' })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navegación pública' })).toBeInTheDocument();
  });

  it('marks the directory as active on a business detail page', async () => {
    (usePathname as jest.Mock).mockReturnValue('/shop/paw-spa');
    await renderHeader();

    expect(screen.getByRole('link', { name: 'Servicios' })).toHaveAttribute('aria-current', 'page');
  });

  it('lets visitors open a mobile menu, find every public destination and close it with Escape', async () => {
    const user = userEvent.setup();
    await renderHeader();
    const trigger = await screen.findByRole('button', { name: 'Abrir menú' });
    await user.click(trigger);

    const menu = screen.getByRole('dialog', { name: 'Explorar Huella' });
    expect(within(menu).getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    expect(within(menu).getByRole('link', { name: 'Servicios' })).toHaveAttribute('href', '/shop');
    expect(within(menu).getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/login');
    expect(within(menu).getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/register');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
