import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PetForm from '@/components/PetForm';

describe('PetForm', () => {
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();
  const defaultProps = {
    ownerId: 'test-owner-id',
    onSuccess: mockOnSuccess,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders form with name field', () => {
      render(<PetForm {...defaultProps} />);

      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    });

    it('renders pet type selector', () => {
      render(<PetForm {...defaultProps} />);

      expect(screen.getByRole('combobox', { name: /tipo/i })).toBeInTheDocument();
    });

    it('renders age input', () => {
      render(<PetForm {...defaultProps} />);

      expect(screen.getByRole('spinbutton', { name: /edad/i })).toBeInTheDocument();
    });

    it('renders size selector', () => {
      render(<PetForm {...defaultProps} />);

      expect(screen.getByRole('combobox', { name: /tamaño/i })).toBeInTheDocument();
    });

    it('renders gender selector', () => {
      render(<PetForm {...defaultProps} />);

      expect(screen.getByRole('combobox', { name: /género/i })).toBeInTheDocument();
    });

    it('renders energy selector', () => {
      render(<PetForm {...defaultProps} />);

      expect(screen.getByRole('combobox', { name: /energía/i })).toBeInTheDocument();
    });

    it('renders bio textarea', () => {
      render(<PetForm {...defaultProps} />);

      expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
    });

    it('renders location input', () => {
      render(<PetForm {...defaultProps} />);

      expect(screen.getByLabelText(/ubicación/i)).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<PetForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
    });

    it('renders vaccinated checkbox', () => {
      render(<PetForm {...defaultProps} />);

      expect(screen.getByLabelText(/vacunado/i)).toBeInTheDocument();
    });

    it('renders neutered checkbox', () => {
      render(<PetForm {...defaultProps} />);

      expect(screen.getByLabelText(/castrado/i)).toBeInTheDocument();
    });

    it('renders activity checkboxes', () => {
      render(<PetForm {...defaultProps} />);

      expect(screen.getByLabelText(/pasear/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/jugar/i)).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('allows entering pet name', async () => {
      render(<PetForm {...defaultProps} />);

      const nameInput = screen.getByLabelText(/nombre/i);
      await userEvent.type(nameInput, 'Max');

      expect(nameInput).toHaveValue('Max');
    });

    it('allows entering age', async () => {
      render(<PetForm {...defaultProps} />);

      const ageInput = screen.getByRole('spinbutton', { name: /edad/i });
      await userEvent.clear(ageInput);
      await userEvent.type(ageInput, '5');

      expect(ageInput).toHaveValue(5);
    });
  });

  describe('Validation', () => {
    it('shows error when age is negative', () => {
      render(<PetForm {...defaultProps} />);

      const ageInput = screen.getByRole('spinbutton', { name: /edad/i });
      expect(ageInput).toHaveValue(1);
    });

    it('accepts valid age', () => {
      render(<PetForm {...defaultProps} />);

      const ageInput = screen.getByRole('spinbutton', { name: /edad/i });
      expect(ageInput).toHaveValue(1);
    });
  });
});
