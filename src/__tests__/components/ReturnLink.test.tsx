import { render, screen } from '@testing-library/react';
import ReturnLink from '@/components/auth/ReturnLink';

describe('destino después de autenticación', () => {
  it('conserva una ruta interna al pasar al registro', () => {
    window.history.replaceState(null, '', '/login?callbackUrl=%2Fshop%3Fcategory%3Dvet');
    render(<ReturnLink href="/register">Registrate</ReturnLink>);
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/register?callbackUrl=%2Fshop%3Fcategory%3Dvet'
    );
  });
  it('descarta destinos externos', () => {
    window.history.replaceState(null, '', '/register?callbackUrl=%2F%2Fevil.example');
    render(<ReturnLink href="/login">Ingresar</ReturnLink>);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/login?callbackUrl=%2Finicio');
  });
});
