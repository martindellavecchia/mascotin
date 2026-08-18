import React from 'react';
import { act, render, screen } from '@testing-library/react';
import Header from '@/components/Header';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/inicio',
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

jest.mock('@/components/notifications/NotificationBell', () => ({
  __esModule: true,
  default: () => <button aria-label="Notificaciones" />,
}));

jest.mock('@/components/header/HeaderMobileMenu', () => ({
  __esModule: true,
  default: () => <button aria-label="Abrir menú" />,
}));

jest.mock('@/components/header/HeaderUserMenu', () => ({
  __esModule: true,
  default: () => <button aria-label="User menu" />,
}));

describe('Header', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      image: 'https://example.com/avatar.jpg',
      role: 'OWNER',
      headerImage: 'https://example.com/owner-avatar.jpg',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function renderHeader(session: typeof mockSession | null) {
    await act(async () => {
      render(<Header session={session} />);
    });
  }

  describe('Rendering', () => {
    it('renders header component', async () => {
      await renderHeader(mockSession);

      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('renders logo', async () => {
      await renderHeader(mockSession);

      expect(screen.getByRole('img', { name: /huella/i })).toBeInTheDocument();
    });

    it('renders home link', async () => {
      await renderHeader(mockSession);

      expect(
        screen.getAllByRole('link', { name: /inicio/i }).some((link) => link.getAttribute('href') === '/inicio')
      ).toBe(true);
    });

    it('renders community link', async () => {
      await renderHeader(mockSession);

      expect(screen.getAllByRole('link', { name: /comunidad/i })).not.toHaveLength(0);
    });

    it('renders events link', async () => {
      await renderHeader(mockSession);

      expect(screen.getByRole('link', { name: /eventos/i })).toBeInTheDocument();
    });

    it('renders foster homes and map links', async () => {
      await renderHeader(mockSession);

      expect(
        screen
          .getAllByRole('link', { name: /^hogares$/i })
          .some((link) => link.getAttribute('href') === '/hogares-de-transito')
      ).toBe(true);
      expect(screen.getByRole('link', { name: /mapa/i })).toBeInTheDocument();
    });

    it('renders services link', async () => {
      await renderHeader(mockSession);

      expect(screen.getByRole('link', { name: /servicios/i })).toBeInTheDocument();
    });

    it('renders messages link', async () => {
      await renderHeader(mockSession);

      expect(screen.getAllByRole('link', { name: /mensajes/i })).not.toHaveLength(0);
    });

    it('renders notifications button', async () => {
      await renderHeader(mockSession);

      expect(screen.getByRole('button', { name: /notificaciones/i })).toBeInTheDocument();
    });

    it('renders user avatar', async () => {
      await renderHeader(mockSession);

      expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
    });
  });

  describe('Null Session', () => {
    it('renders without crashing when session is null', async () => {
      await renderHeader(null);

      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });
});
