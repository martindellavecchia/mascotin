import { render, screen } from '@testing-library/react';
import { PetCard } from '@/components/profile/PetCard';
import type { Pet } from '@/types';

const pet: Pet = {
  id: 'pet-1',
  ownerId: 'owner-1',
  name: 'Luna',
  petType: 'dog',
  breed: 'Mestiza',
  age: 4,
  weight: 12,
  size: 'medium',
  gender: 'female',
  vaccinated: true,
  neutered: true,
  energy: 'medium',
  bio: 'Luna disfruta jugar y pasear todos los días.',
  activities: ['play'],
  location: 'Palermo',
  images: JSON.stringify([
    '/images/old-pet.jpg',
    'data:image/webp;base64,abc',
  ]),
  thumbnailIndex: 1,
  level: 1,
  xp: 0,
  totalMatches: 0,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('profile PetCard image compatibility', () => {
  it('renders the selected inline WebP image', () => {
    render(<PetCard pet={pet} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByRole('img', { name: 'Luna' })).toHaveAttribute(
      'src',
      'data:image/webp;base64,abc'
    );
  });

  it('renders puppies as less than one year old', () => {
    render(<PetCard pet={{ ...pet, age: 0 }} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText('Menos de 1 año')).toBeInTheDocument();
    expect(screen.queryByText('0 años')).not.toBeInTheDocument();
  });

  it('hides unset facts of pets created through the short wizard', () => {
    render(
      <PetCard
        pet={{ ...pet, age: 0, gender: '', size: '', energy: '' }}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.queryByText(/año/)).not.toBeInTheDocument();
    expect(screen.queryByText('Macho')).not.toBeInTheDocument();
    expect(screen.queryByText('Hembra')).not.toBeInTheDocument();
  });
});
