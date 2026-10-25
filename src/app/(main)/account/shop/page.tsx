import ShopDirectoryPage from '@/components/shop/ShopDirectoryPage';

export { metadata } from '@/app/(public)/shop/page';

export default function AccountShopPage() {
  return <ShopDirectoryPage signedIn />;
}
