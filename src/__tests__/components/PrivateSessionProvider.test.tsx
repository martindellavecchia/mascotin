import { render, screen } from '@testing-library/react';
import PrivateSessionProvider from '@/components/PrivateSessionProvider';

const sessionProvider = jest.fn(({ children }: { children: React.ReactNode }) => (
  <div data-testid="session-provider">{children}</div>
));

jest.mock('next-auth/react', () => ({
  SessionProvider: (props: { children: React.ReactNode; refetchOnWindowFocus?: boolean; refetchInterval?: number }) =>
    sessionProvider(props),
}));

describe('PrivateSessionProvider', () => {
  it('seeds the session and disables refetch on focus and interval', () => {
    const session = {
      user: { id: 'user-1', name: 'Ana', email: 'ana@example.com' },
      expires: '2099-01-01T00:00:00.000Z',
    };

    render(
      <PrivateSessionProvider session={session}>
        <p>inicio autenticado</p>
      </PrivateSessionProvider>
    );

    expect(screen.getByText('inicio autenticado')).toBeInTheDocument();
    expect(sessionProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        session,
        refetchOnWindowFocus: false,
        refetchInterval: 0,
      })
    );
  });
});
