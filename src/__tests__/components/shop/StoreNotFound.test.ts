import { readFileSync } from 'fs';
import path from 'path';

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('store detail 404', () => {
  it('keeps Vercel analytics out of local HTML while remaining in the production layout', () => {
    const layout = readSource('src/app/layout.tsx');
    expect(layout).toContain('process.env.VERCEL');
    expect(layout).toContain('<Analytics />');
    expect(layout).toContain('<SpeedInsights />');
  });

  it('calls notFound when the public store is missing', () => {
    const page = readSource('src/app/(public)/shop/[slug]/page.tsx');
    expect(page).toContain('notFound()');
    expect(page).not.toContain('No encontramos este negocio');
  });

  it('renders the dedicated not-found UI', () => {
    const notFound = readSource('src/app/(public)/shop/[slug]/not-found.tsx');
    expect(notFound).toContain('No encontramos este negocio');
    expect(notFound).toContain('href="/shop"');
    expect(notFound).toContain('Volver a negocios');
  });
});
