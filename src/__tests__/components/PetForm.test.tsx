import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import PetForm from '@/components/PetForm';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

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

  describe('Unset values from the short wizard', () => {
    const wizardPet = {
      id: 'pet-1',
      name: 'Mora',
      petType: 'dog',
      age: 0,
      gender: '',
      size: '',
      energy: '',
      vaccinated: null,
      neutered: null,
      images: '[]',
    };

    it('does not invent defaults for missing age, sex, size, energy or vaccines', () => {
      render(<PetForm {...defaultProps} initialData={wizardPet} />);

      expect(screen.getByRole('spinbutton', { name: /edad/i })).toHaveValue(null);
      expect(screen.getByRole('combobox', { name: /sexo/i })).toHaveTextContent('Seleccioná…');
      expect(screen.getByRole('combobox', { name: /tamaño/i })).toHaveTextContent('Seleccioná…');
      expect(screen.getByRole('combobox', { name: /energía/i })).toHaveTextContent('Seleccioná…');
      expect(screen.getByLabelText(/vacunado/i)).not.toBeChecked();
    });

    it('asks for every missing field inline instead of saving silent defaults', async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as jest.Mock;
      const user = userEvent.setup();
      render(<PetForm {...defaultProps} initialData={wizardPet} />);

      await user.click(screen.getByRole('button', { name: /actualizar mascota/i }));

      expect(await screen.findByText('Ingresá la edad')).toBeInTheDocument();
      expect(screen.getByText('Elegí el sexo')).toBeInTheDocument();
      expect(screen.getByText('Elegí el tamaño')).toBeInTheDocument();
      expect(screen.getByText('Elegí el nivel de energía')).toBeInTheDocument();
      expect(screen.getAllByText('Seleccioná al menos una actividad').length).toBeGreaterThan(1);
      expect(screen.getByText('Agregá al menos una foto')).toBeInTheDocument();
      expect(toast.error).toHaveBeenCalledWith('Revisá los campos marcados.');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('keeps an explicit age of 0 for complete profiles', () => {
      render(<PetForm {...defaultProps} initialData={{ ...wizardPet, gender: 'female' }} />);

      expect(screen.getByRole('spinbutton', { name: /edad/i })).toHaveValue(0);
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

    it('reports unsaved changes to the parent', async () => {
      const onDirtyChange = jest.fn();
      render(<PetForm {...defaultProps} onDirtyChange={onDirtyChange} />);

      expect(onDirtyChange).toHaveBeenLastCalledWith(false);
      await userEvent.type(screen.getByLabelText(/nombre/i), 'Max');

      expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    });
  });

  describe('Photos stay local until the form is submitted', () => {
    it('uploads a new photo and makes it the main one without saving the pet', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'data:image/webp;base64,abc' }),
      });
      global.fetch = fetchMock as jest.Mock;
      const user = userEvent.setup();
      const { container } = render(
        <PetForm
          {...defaultProps}
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
      expect(screen.getByAltText('Foto 2').parentElement).toHaveTextContent('Foto principal');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/upload', expect.objectContaining({ method: 'POST' }));
    });

    it('rejects oversized and unsupported files before uploading', async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as jest.Mock;
      const user = userEvent.setup({ applyAccept: false });
      const { container } = render(<PetForm {...defaultProps} />);
      const input = container.querySelector('#image-upload') as HTMLInputElement;
      const huge = new File(['x'], 'enorme.jpg', { type: 'image/jpeg' });
      Object.defineProperty(huge, 'size', { value: 6 * 1024 * 1024 });
      const svg = new File(['<svg />'], 'logo.svg', { type: 'image/svg+xml' });

      await user.upload(input, [huge, svg]);

      await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
      expect(toast.error).toHaveBeenCalledWith('"enorme.jpg" pesa más de 5 MB. Elegí una imagen más liviana.');
      expect(toast.error).toHaveBeenCalledWith('"logo.svg" no es una imagen compatible. Usá JPG, PNG o WebP.');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('changes the main photo locally when its star is clicked', async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as jest.Mock;
      const user = userEvent.setup();

      render(
        <PetForm
          {...defaultProps}
          initialData={{
            id: 'pet-1',
            images: JSON.stringify(['/images/first.jpg', '/images/second.jpg']),
            thumbnailIndex: 0,
          }}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Usar foto 2 como foto principal' }));

      expect(screen.getByRole('button', { name: 'Foto 2 es la foto principal' })).toHaveAttribute('aria-pressed', 'true');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('removes a photo locally with a labelled button', async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as jest.Mock;
      const onDirtyChange = jest.fn();
      const user = userEvent.setup();

      render(
        <PetForm
          {...defaultProps}
          onDirtyChange={onDirtyChange}
          initialData={{
            id: 'pet-1',
            images: JSON.stringify(['/images/first.jpg', '/images/second.jpg']),
            thumbnailIndex: 1,
          }}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Quitar foto 1' }));

      expect(screen.queryByAltText('Foto 2')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Foto 1 es la foto principal' })).toHaveAttribute('aria-pressed', 'true');
      expect(onDirtyChange).toHaveBeenLastCalledWith(true);
      expect(fetchMock).not.toHaveBeenCalled();
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
        name: 'Foto 1 es la foto principal',
      })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('Foto principal')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('starts a new pet with an empty age instead of a default', () => {
      render(<PetForm {...defaultProps} />);

      expect(screen.getByRole('spinbutton', { name: /edad/i })).toHaveValue(null);
    });

    it('keeps the saved age when editing', () => {
      render(<PetForm {...defaultProps} initialData={{ id: 'pet-1', age: 4, gender: 'male' }} />);

      expect(screen.getByRole('spinbutton', { name: /edad/i })).toHaveValue(4);
    });
  });
});
