import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OwnerForm from '@/components/OwnerForm';

describe('OwnerForm', () => {
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();
  const defaultProps = {
    userId: 'test-user-id',
    onSuccess: mockOnSuccess,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders form with name field', () => {
      render(<OwnerForm {...defaultProps} />);

      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    });

    it('renders phone input', () => {
      render(<OwnerForm {...defaultProps} />);

      expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument();
    });

    it('renders location input', () => {
      render(<OwnerForm {...defaultProps} />);

      expect(screen.getByLabelText(/ubicación/i)).toBeInTheDocument();
    });

    it('renders bio textarea', () => {
      render(<OwnerForm {...defaultProps} />);

      expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<OwnerForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
    });

    it('renders hasYard checkbox', () => {
      render(<OwnerForm {...defaultProps} />);

      expect(screen.getByLabelText(/patio/i)).toBeInTheDocument();
    });

    it('renders hasOtherPets checkbox', () => {
      render(<OwnerForm {...defaultProps} />);

      expect(screen.getByLabelText(/otras mascotas/i)).toBeInTheDocument();
    });

    it('renders profile photo section', () => {
      render(<OwnerForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Cambiar foto de perfil' })).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('allows entering owner name', async () => {
      render(<OwnerForm {...defaultProps} />);

      const nameInput = screen.getByLabelText(/nombre/i);
      await userEvent.type(nameInput, 'John Doe');

      expect(nameInput).toHaveValue('John Doe');
    });

    it('allows entering phone number', async () => {
      render(<OwnerForm {...defaultProps} />);
      await userEvent.click(screen.getByText('Más sobre vos'));

      const phoneInput = screen.getByLabelText(/teléfono/i);
      await userEvent.type(phoneInput, '+1234567890');

      expect(phoneInput).toHaveValue('+1234567890');
    });

    it('allows entering location', async () => {
      render(<OwnerForm {...defaultProps} />);

      const locationInput = screen.getByLabelText(/ubicación/i);
      await userEvent.type(locationInput, 'Madrid');

      expect(locationInput).toHaveValue('Madrid');
    });

    it('allows entering bio', async () => {
      render(<OwnerForm {...defaultProps} />);
      await userEvent.click(screen.getByText('Más sobre vos'));

      const bioInput = screen.getByLabelText(/bio/i);
      await userEvent.type(bioInput, 'I love pets!');

      expect(bioInput).toHaveValue('I love pets!');
    });

    it('toggles hasYard checkbox', async () => {
      render(<OwnerForm {...defaultProps} />);
      await userEvent.click(screen.getByText('Más sobre vos'));

      const checkbox = screen.getByLabelText(/patio/i);
      await userEvent.click(checkbox);

      expect(checkbox).toBeChecked();
    });

    it('toggles hasOtherPets checkbox', async () => {
      render(<OwnerForm {...defaultProps} />);
      await userEvent.click(screen.getByText('Más sobre vos'));

      const checkbox = screen.getByLabelText(/otras mascotas/i);
      await userEvent.click(checkbox);

      expect(checkbox).toBeChecked();
    });
  });

  describe('Validation', () => {
    it('creates a new profile with the suggested name without treating it as an edit', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ owner: { id: 'owner-1' } }) });
      render(<OwnerForm {...defaultProps} defaultName="Ana Pérez" />);
      expect(screen.getByLabelText(/nombre/i)).toHaveValue('Ana Pérez');
      expect(screen.getByLabelText(/teléfono/i)).not.toBeVisible();
      await userEvent.type(screen.getByLabelText(/ubicación/i), 'Córdoba, Argentina');
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
      await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/owner/profile', expect.objectContaining({
        method: 'POST', body: expect.stringContaining('Ana Pérez'),
      })));
      expect(mockOnSuccess).toHaveBeenCalledWith({ id: 'owner-1' });
    });

    it('preserves optional data while the details are collapsed when editing', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ owner: { id: 'owner-1' } }) });
      render(<OwnerForm {...defaultProps} initialData={{ name: 'Ana', location: 'Córdoba', phone: '12345', bio: 'Tengo un perro', hasYard: true }} />);
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
      await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/owner/profile', expect.objectContaining({
        method: 'PUT', body: expect.stringContaining('Tengo un perro'),
      })));
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body).toMatchObject({ phone: '12345', hasYard: true });
    });

    it('opens optional details and focuses an invalid biography on submit', async () => {
      render(<OwnerForm {...defaultProps} initialData={{ name: 'Ana', location: 'Córdoba', bio: 'a'.repeat(501) }} />);
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
      expect(await screen.findByText('La biografía no puede superar los 500 caracteres')).toBeVisible();
      await waitFor(() => expect(screen.getByLabelText(/biografía/i)).toHaveFocus());
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('accepts valid name', async () => {
      render(<OwnerForm {...defaultProps} />);

      const nameInput = screen.getByLabelText(/nombre/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'John Doe');
      await userEvent.tab();

      expect(nameInput).toHaveValue('John Doe');
    });

    it('accepts valid location', async () => {
      render(<OwnerForm {...defaultProps} />);

      const locationInput = screen.getByLabelText(/ubicación/i);
      await userEvent.type(locationInput, 'Madrid');

      expect(locationInput).toHaveValue('Madrid');
    });
  });
});
