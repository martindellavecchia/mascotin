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
      { src: '/brand/huella-logo.png', sizes: 'any', type: 'image/png', purpose: 'any' },
    ],
  };
}
