import React from 'react';
import { render, screen } from '@testing-library/react';
import Header from '@/components/Header';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/',
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.jpg',
        id: 'user-123',
      },
    },
    status: 'authenticated',
  }),
}));

jest.mock('@/hooks/useFetchWithError', () => ({
  useFetchWithError: () => ({
    fetchWithError: jest.fn(() => Promise.resolve({ success: true, data: null })),
  }),
}));

describe('Header', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      image: 'https://example.com/avatar.jpg',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders header component', () => {
      render(<Header session={mockSession} />);

      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('renders logo', () => {
      render(<Header session={mockSession} />);

      expect(screen.getByText(/mascotin/i)).toBeInTheDocument();
    });

    it('renders dashboard link', () => {
      render(<Header session={mockSession} />);

      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    });

    it('renders community link', () => {
      render(<Header session={mockSession} />);

      expect(screen.getByRole('link', { name: /comunidad/i })).toBeInTheDocument();
    });

    it('renders services link', () => {
      render(<Header session={mockSession} />);

      expect(screen.getByRole('link', { name: /servicios/i })).toBeInTheDocument();
    });

    it('renders messages link', () => {
      render(<Header session={mockSession} />);

      expect(screen.getByRole('link', { name: /mensajes/i })).toBeInTheDocument();
    });

    it('renders notifications button', () => {
      render(<Header session={mockSession} />);

      expect(screen.getByRole('button', { name: /notificaciones/i })).toBeInTheDocument();
    });

    it('renders user avatar', () => {
      render(<Header session={mockSession} />);

      expect(screen.getByRole('button', { name: '' })).toBeInTheDocument();
    });
  });

  describe('Null Session', () => {
    it('renders without crashing when session is null', () => {
      render(<Header session={null} />);

      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });
});
