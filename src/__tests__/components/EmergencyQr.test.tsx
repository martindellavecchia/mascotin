import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmergencyQr from '@/components/pets/EmergencyQr';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(async () => 'data:image/png;base64,qr'),
}));

describe('EmergencyQr', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  it('renders nothing without token', () => {
    const { container } = render(<EmergencyQr token={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows download, copy and share actions', async () => {
    const user = userEvent.setup();
    render(<EmergencyQr token="abc123token" />);

    expect(await screen.findByAltText(/qr de emergencia/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /descargar png/i })).toHaveAttribute('download');
    await user.click(screen.getByRole('button', { name: /copiar enlace/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /compartir/i })).toBeInTheDocument();
  });
});
