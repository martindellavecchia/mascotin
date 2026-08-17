import { render, screen } from '@testing-library/react';
import PublicHeader from '@/components/PublicHeader';

describe('PublicHeader', () => {
  it('keeps the app CTA without prefetching the private home', () => {
    render(<PublicHeader />);

    expect(screen.getByRole('link', { name: 'Ir a la app' })).toHaveAttribute('href', '/inicio');
    expect(screen.getByRole('link', { name: 'Servicios' })).toHaveAttribute('href', '/shop');
  });
});
