describe('SITE_URL', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.NEXTAUTH_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function loadSiteUrl() {
    return (jest.requireActual('@/lib/site-url') as typeof import('@/lib/site-url')).SITE_URL;
  }

  it('usa el dominio de producción de Vercel en producción', () => {
    process.env.VERCEL_ENV = 'production';
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'mascotin-pi.vercel.app';
    process.env.NEXTAUTH_URL = 'https://mascotin-git-main.vercel.app/';
    expect(loadSiteUrl()).toBe('https://mascotin-pi.vercel.app');
  });

  it('quita la barra final de NEXTAUTH_URL fuera de producción', () => {
    process.env.NEXTAUTH_URL = 'https://preview.example.app/';
    expect(loadSiteUrl()).toBe('https://preview.example.app');
  });

  it('usa localhost por defecto', () => {
    expect(loadSiteUrl()).toBe('http://localhost:3000');
  });
});
