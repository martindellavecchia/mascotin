import React from 'react';
import { render, screen } from '@testing-library/react';
import PetCard from '@/components/PetCard';

describe('PetCard', () => {
  const mockPet = {
    id: 'pet-123',
    ownerId: 'owner-123',
    name: 'Max',
    petType: 'dog',
    breed: 'Golden Retriever',
    age: 3,
    weight: 30,
    size: 'large',
    gender: 'male',
    vaccinated: true,
    neutered: false,
    energy: 'high',
    bio: 'Friendly dog who loves walks',
    activities: ['walking', 'playing'],
    location: 'Madrid',
    images: ['max1.jpg', 'max2.jpg'],
    thumbnailIndex: 0,
    level: 1,
    xp: 100,
    totalMatches: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders pet name and age in heading', () => {
      render(<PetCard pet={mockPet as any} />);

      expect(screen.getByRole('heading', { name: /max/i })).toBeInTheDocument();
      expect(screen.getByText(/3/i)).toBeInTheDocument();
    });

    it('renders pet breed', () => {
      render(<PetCard pet={mockPet as any} />);

      expect(screen.getByText('Golden Retriever')).toBeInTheDocument();
    });

    it('renders pet location', () => {
      render(<PetCard pet={mockPet as any} />);

      expect(screen.getByText('Madrid')).toBeInTheDocument();
    });

    it('renders pet size badge', () => {
      render(<PetCard pet={mockPet as any} />);

      expect(screen.getByText('Grande')).toBeInTheDocument();
    });

    it('renders pet bio', () => {
      render(<PetCard pet={mockPet as any} />);

      expect(screen.getByText(/friendly dog/i)).toBeInTheDocument();
    });

    it('renders activity badges', () => {
      render(<PetCard pet={mockPet as any} />);

      expect(screen.getByText('walking')).toBeInTheDocument();
      expect(screen.getByText('playing')).toBeInTheDocument();
    });

    it('renders energy level', () => {
      render(<PetCard pet={mockPet as any} />);

      expect(screen.getByText('Alta')).toBeInTheDocument();
    });

    it('renders vaccinated badge', () => {
      render(<PetCard pet={mockPet as any} />);

      expect(screen.getByText(/vacunado/i)).toBeInTheDocument();
    });

    it('renders level badge', () => {
      render(<PetCard pet={mockPet as any} />);

      expect(screen.getByText(/nivel/i)).toBeInTheDocument();
    });
  });

  describe('Different Pet Types', () => {
    it('renders cat pet type', () => {
      const catPet = { ...mockPet, petType: 'cat' };

      render(<PetCard pet={catPet as any} />);

      expect(screen.getByRole('heading', { name: /max/i })).toBeInTheDocument();
    });

    it('renders bird pet type', () => {
      const birdPet = { ...mockPet, petType: 'bird' };

      render(<PetCard pet={birdPet as any} />);

      expect(screen.getByRole('heading', { name: /max/i })).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('renders small size', () => {
      const smallPet = { ...mockPet, size: 'small' };

      render(<PetCard pet={smallPet as any} />);

      expect(screen.getByText('Pequeño')).toBeInTheDocument();
    });

    it('renders medium size', () => {
      const mediumPet = { ...mockPet, size: 'medium' };

      render(<PetCard pet={mediumPet as any} />);

      expect(screen.getByText('Mediano')).toBeInTheDocument();
    });

    it('renders xlarge size', () => {
      const xlargePet = { ...mockPet, size: 'xlarge' };

      render(<PetCard pet={xlargePet as any} />);

      expect(screen.getByText('Extra Grande')).toBeInTheDocument();
    });
  });

  describe('Energy Variants', () => {
    it('renders low energy', () => {
      const lowEnergyPet = { ...mockPet, energy: 'low' };

      render(<PetCard pet={lowEnergyPet as any} />);

      expect(screen.getByText('Baja')).toBeInTheDocument();
    });

    it('renders medium energy', () => {
      const mediumEnergyPet = { ...mockPet, energy: 'medium' };

      render(<PetCard pet={mediumEnergyPet as any} />);

      expect(screen.getByText('Media')).toBeInTheDocument();
    });
  });

  describe('Image Handling', () => {
    it('handles empty images array', () => {
      const petWithNoImages = { ...mockPet, images: [] };

      render(<PetCard pet={petWithNoImages as any} />);

      expect(screen.getByRole('heading', { name: /max/i })).toBeInTheDocument();
    });

    it('handles null images', () => {
      const petWithNullImages = { ...mockPet, images: null };

      render(<PetCard pet={petWithNullImages as any} />);

      expect(screen.getByRole('heading', { name: /max/i })).toBeInTheDocument();
    });
  });
});
