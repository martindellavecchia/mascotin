import React from 'react';
import { render, screen } from '@testing-library/react';
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

      expect(screen.getByText(/foto de perfil/i)).toBeInTheDocument();
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

      const bioInput = screen.getByLabelText(/bio/i);
      await userEvent.type(bioInput, 'I love pets!');

      expect(bioInput).toHaveValue('I love pets!');
    });

    it('toggles hasYard checkbox', async () => {
      render(<OwnerForm {...defaultProps} />);

      const checkbox = screen.getByLabelText(/patio/i);
      await userEvent.click(checkbox);

      expect(checkbox).toBeChecked();
    });

    it('toggles hasOtherPets checkbox', async () => {
      render(<OwnerForm {...defaultProps} />);

      const checkbox = screen.getByLabelText(/otras mascotas/i);
      await userEvent.click(checkbox);

      expect(checkbox).toBeChecked();
    });
  });

  describe('Validation', () => {
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
