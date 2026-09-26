'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error boundary:', error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#fff8ef',
          color: '#271e27',
          padding: '1rem',
          textAlign: 'center',
        }}
      >
        <main>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Algo salió mal</h1>
          <p style={{ color: '#6a5d69', maxWidth: '28rem', margin: '0 auto 1.5rem' }}>
            Tuvimos un problema inesperado al cargar Huella. Probá de nuevo en unos segundos.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#4b244a',
              color: '#fff',
              border: 0,
              borderRadius: '0.5rem',
              padding: '0.65rem 1.25rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
