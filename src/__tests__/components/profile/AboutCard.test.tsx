import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AboutCard } from '@/components/profile/AboutCard';
import { PetCard } from '@/components/profile/PetCard';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string; src: string }) => (
    <img alt={props.alt} src={props.src} />
  ),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('AboutCard', () => {
  it('shows empty state and edit CTA when bio is missing', async () => {
    const onEdit = jest.fn();
    render(<AboutCard onEdit={onEdit} />);

    expect(screen.getByText(/todavía no escribiste tu biografía/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /editar biografía/i }));
    expect(onEdit).toHaveBeenCalled();
  });

  it('does not invent a fake bio for short or garbage text', () => {
    render(<AboutCard bio="aa" />);
    expect(screen.getByText(/todavía no escribiste tu biografía/i)).toBeInTheDocument();
    expect(screen.queryByText(/amante de los animales/i)).not.toBeInTheDocument();
  });

  it('renders real bio when present', () => {
    render(<AboutCard bio="Me encanta pasear con mis perros por el parque todos los días." />);
    expect(screen.getByText(/me encanta pasear con mis perros/i)).toBeInTheDocument();
  });
});

describe('Profile PetCard gender', () => {
  const basePet = {
    id: 'pet-1',
    ownerId: 'owner-1',
    name: 'Luna',
    petType: 'dog',
    breed: 'Labrador Retriever Extra Largo Nombre',
    age: 4,
    weight: 20,
    size: 'medium',
    gender: 'female',
    vaccinated: true,
    neutered: true,
    energy: 'medium',
    bio: 'Una perra amigable',
    activities: ['walk'],
    location: 'Madrid',
    images: JSON.stringify(['https://example.com/luna.jpg']),
    thumbnailIndex: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('shows female gender icon for female pets', () => {
    render(
      <PetCard
        pet={basePet as any}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('Hembra')).toBeInTheDocument();
    expect(screen.getByText('Ver pasaporte')).toBeInTheDocument();
  });

  it('shows male gender icon for male pets', () => {
    render(
      <PetCard
        pet={{ ...basePet, gender: 'male', name: 'Max' } as any}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('Macho')).toBeInTheDocument();
  });

  it('shows a single edit action for the pet', () => {
    render(
      <PetCard
        pet={basePet as any}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument();
  });
});
