import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PetOnboardingWizard from '@/components/onboarding/PetOnboardingWizard';

describe('PetOnboardingWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('asks only for the two fields required to reach Descubrir', () => {
    render(<PetOnboardingWizard onSuccess={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByRole('textbox', { name: /nombre/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Perro' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /bio|ubicación/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /subir foto/i })).not.toBeInTheDocument();
  });

  it('shows validation beside the visible fields without calling the API', async () => {
    const user = userEvent.setup();
    render(<PetOnboardingWizard onSuccess={jest.fn()} onCancel={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /crear y descubrir/i }));

    expect(screen.getByText('El nombre es requerido')).toBeInTheDocument();
    expect(screen.getByText('El tipo de mascota es requerido')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('creates a minimal pet and hands it off to Descubrir', async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    const pet = { id: 'pet-1', name: 'Mora', petType: 'dog' };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, pet }),
    });
    render(<PetOnboardingWizard onSuccess={onSuccess} onCancel={jest.fn()} />);

    await user.type(screen.getByRole('textbox', { name: /nombre/i }), 'Mora');
    await user.click(screen.getByRole('radio', { name: 'Perro' }));
    await user.click(screen.getByRole('button', { name: /crear y descubrir/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(pet));
    expect(global.fetch).toHaveBeenCalledWith('/api/pet/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Mora', petType: 'dog' }),
    });
  });
});
