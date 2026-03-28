interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

function getEmailConfig() {
  return {
    resendApiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM || 'MascoTin <no-reply@mascotin.app>',
  };
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  const { resendApiKey, from } = getEmailConfig();

  if (!resendApiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RESEND_API_KEY no configurada en producción');
    }

    // Fallback local para desarrollo y tests
    console.log('========== EMAIL (DEV) ==========');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html}`);
    console.log('===============================');
    return true;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error enviando email: ${response.status} ${errorBody}`);
  }

  return true;
}

export function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

export function buildVerificationEmail(name: string, token: string): EmailOptions & { to: string } {
  const url = `${getBaseUrl()}/verify-email?token=${token}`;
  return {
    to: '',
    subject: 'Verifica tu email - MascoTin',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>¡Hola ${name}!</h2>
        <p>Gracias por registrarte en MascoTin. Para completar tu registro, verifica tu email haciendo clic en el siguiente enlace:</p>
        <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
          Verificar Email
        </a>
        <p style="color: #666; font-size: 14px;">Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
        <p style="color: #666; font-size: 12px;">Este enlace expira en 24 horas.</p>
      </div>
    `,
  };
}

export function buildPasswordResetEmail(name: string, token: string): EmailOptions & { to: string } {
  const url = `${getBaseUrl()}/reset-password?token=${token}`;
  return {
    to: '',
    subject: 'Restablecer contraseña - MascoTin',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>¡Hola ${name}!</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva:</p>
        <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
          Restablecer Contraseña
        </a>
        <p style="color: #666; font-size: 14px;">Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
        <p style="color: #666; font-size: 12px;">Este enlace expira en 1 hora.</p>
      </div>
    `,
  };
}
