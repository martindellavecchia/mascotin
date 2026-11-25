import { render, screen } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import RegisterPage from '@/app/register/page';
import ForgotPasswordPage from '@/app/forgot-password/page';
import ResetPasswordPage from '@/app/reset-password/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams('token=reset-token'),
}));
jest.mock('next-auth/react', () => ({ signIn: jest.fn() }));
jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/brand/BrandLink', () => ({ __esModule: true, default: () => null }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

function expectField(label: string, attributes: Record<string, string>) {
  const field = screen.getByLabelText(label);
  for (const [name, value] of Object.entries(attributes)) {
    expect(field).toHaveAttribute(name, value);
  }
}

describe('autocompletado de los formularios de cuenta', () => {
  it('marca el ingreso con el usuario y la contraseña actual', () => {
    render(<LoginPage />);
    expectField('Correo electrónico', { name: 'email', autocomplete: 'username', spellcheck: 'false' });
    expectField('Contraseña', { name: 'password', autocomplete: 'current-password' });
  });

  it('pide contraseñas nuevas en el registro', () => {
    render(<RegisterPage />);
    expectField('Nombre completo', { name: 'name', autocomplete: 'name' });
    expectField('Correo electrónico', { name: 'email', autocomplete: 'username', spellcheck: 'false' });
    expectField('Contraseña', { name: 'password', autocomplete: 'new-password' });
    expectField('Confirmar contraseña', { name: 'confirmPassword', autocomplete: 'new-password' });
  });

  it('completa el correo al pedir el enlace de recuperación', () => {
    render(<ForgotPasswordPage />);
    expectField('Correo electrónico', { name: 'email', autocomplete: 'email', spellcheck: 'false' });
  });

  it('pide contraseñas nuevas al restablecer', async () => {
    render(<ResetPasswordPage />);
    await screen.findByLabelText('Nueva contraseña');
    expectField('Nueva contraseña', { name: 'password', autocomplete: 'new-password' });
    expectField('Confirmar contraseña', { name: 'confirmPassword', autocomplete: 'new-password' });
  });
});
