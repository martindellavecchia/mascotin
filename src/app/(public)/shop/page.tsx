import ShopDirectoryPage from '@/components/shop/ShopDirectoryPage';

export const revalidate = 300;

export const metadata = {
  title: 'Servicios para mascotas',
  description: 'Veterinarias, peluquerías, paseadores y comercios de cercanía con reseñas verificadas de la comunidad.',
};

export default function ShopPage() {
  return <ShopDirectoryPage signedIn={false} />;
}
