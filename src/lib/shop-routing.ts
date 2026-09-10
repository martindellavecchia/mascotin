const PUBLIC_SHOP_PATH = '/shop';
const ACCOUNT_SHOP_PATH = '/account/shop';

export function getAccountShopPath(pathname: string) {
  if (pathname === PUBLIC_SHOP_PATH || pathname.startsWith(`${PUBLIC_SHOP_PATH}/`)) {
    return `${ACCOUNT_SHOP_PATH}${pathname.slice(PUBLIC_SHOP_PATH.length)}`;
  }
  return null;
}

export function getPublicShopPath(pathname: string) {
  if (pathname === ACCOUNT_SHOP_PATH || pathname.startsWith(`${ACCOUNT_SHOP_PATH}/`)) {
    return `${PUBLIC_SHOP_PATH}${pathname.slice(ACCOUNT_SHOP_PATH.length)}`;
  }
  return pathname;
}
