import { render, screen } from '@testing-library/react';
import BusinessOwnerBadge from '@/components/business/BusinessOwnerBadge';

describe('BusinessOwnerBadge', () => {
  it('exposes the business owner identity to assistive technology', () => {
    render(<BusinessOwnerBadge />);
    expect(screen.getByLabelText('Dueño/a de negocio verificado')).toBeInTheDocument();
  });
});
