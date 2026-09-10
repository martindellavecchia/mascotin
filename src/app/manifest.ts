import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Huella',
    short_name: 'Huella',
    description: 'Comunidad, cuidado y encuentros para mascotas',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff8ef',
    theme_color: '#4b244a',
    lang: 'es-AR',
    icons: [
      { src: '/icons/icon-192.png?v=huella-1', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png?v=huella-1', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png?v=huella-1', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
