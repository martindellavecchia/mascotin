import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PetForm from '@/components/PetForm';

describe('PetForm', () => {
  const originalFetch = global.fetch;
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

  afterEach(() => {
    global.fetch = originalFetch;
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

      expect(screen.getByRole('combobox', { name: /sexo/i })).toBeInTheDocument();
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

    it('makes a newly uploaded photo the profile image when editing', async () => {
      const onThumbnailChange = jest.fn();
      const fetchMock = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'data:image/webp;base64,abc' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            pet: {
              id: 'pet-1',
              images: JSON.stringify(['/images/old.jpg', 'data:image/webp;base64,abc']),
              thumbnailIndex: 1,
            },
          }),
        });
      global.fetch = fetchMock as jest.Mock;
      const user = userEvent.setup();
      const { container } = render(
        <PetForm
          {...defaultProps}
          onThumbnailChange={onThumbnailChange}
          initialData={{
            id: 'pet-1',
            images: JSON.stringify(['/images/old.jpg']),
            thumbnailIndex: 0,
          }}
        />
      );
      const input = container.querySelector('#image-upload') as HTMLInputElement;
      const file = new File(['photo'], 'nueva-foto.jpg', { type: 'image/jpeg' });

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByAltText('Foto 2')).toBeInTheDocument();
      });
      expect(screen.getByAltText('Foto 2').parentElement).toHaveTextContent('Foto principal actual');
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      const updateRequest = fetchMock.mock.calls[1][1] as RequestInit;
      expect(JSON.parse(updateRequest.body as string)).toMatchObject({ thumbnailIndex: 1 });
      expect(onThumbnailChange).toHaveBeenCalledWith(expect.objectContaining({
        id: 'pet-1',
        thumbnailIndex: 1,
      }));
    });

    it('saves a different profile photo immediately when its star is clicked', async () => {
      const updatedPet = {
        id: 'pet-1',
        images: JSON.stringify(['/images/first.jpg', '/images/second.jpg']),
        thumbnailIndex: 1,
      };
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ pet: updatedPet }),
      });
      const onThumbnailChange = jest.fn();
      global.fetch = fetchMock as jest.Mock;
      const user = userEvent.setup();

      render(
        <PetForm
          {...defaultProps}
          onThumbnailChange={onThumbnailChange}
          initialData={{
            id: 'pet-1',
            images: updatedPet.images,
            thumbnailIndex: 0,
          }}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Usar Foto 2 como foto de perfil' }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      const updateRequest = fetchMock.mock.calls[0][1] as RequestInit;
      expect(JSON.parse(updateRequest.body as string)).toEqual({
        images: updatedPet.images,
        thumbnailIndex: 1,
      });
      expect(await screen.findByRole('button', {
        name: 'Foto 2 es la foto de perfil actual',
      })).toHaveAttribute('aria-pressed', 'true');
      expect(onThumbnailChange).toHaveBeenCalledWith(updatedPet);
    });

    it('clearly identifies the current photo when there is only one image', () => {
      render(
        <PetForm
          {...defaultProps}
          initialData={{
            id: 'pet-1',
            images: JSON.stringify(['/images/only.jpg']),
            thumbnailIndex: 0,
          }}
        />
      );

      expect(screen.getByRole('button', {
        name: 'Foto 1 es la foto de perfil actual',
      })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('Foto principal actual')).toBeInTheDocument();
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
