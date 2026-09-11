export const PRODUCT_INTENTS = ['MEET', 'ADOPT', 'HELP', 'SERVICES'] as const;
export type ProductIntent = (typeof PRODUCT_INTENTS)[number];
export const INTENT_OPTIONS: Record<
  ProductIntent,
  { title: string; description: string; href: string }
> = {
  MEET: {
    title: 'Conocer mascotas',
    description: 'Encontrá compañía compatible para tu mascota.',
    href: '/inicio?tab=explore',
  },
  ADOPT: {
    title: 'Quiero adoptar',
    description: 'Conocé mascotas que buscan un hogar definitivo.',
    href: '/adoptions',
  },
  HELP: {
    title: 'Ofrecer tránsito o ayudar',
    description: 'Ofrecé tu hogar o participá como voluntario.',
    href: '/hogares-de-transito',
  },
  SERVICES: {
    title: 'Buscar servicios',
    description: 'Encontrá servicios para el cuidado de tu mascota.',
    href: '/shop',
  },
};
export function isProductIntent(value: unknown): value is ProductIntent {
  return typeof value === 'string' && PRODUCT_INTENTS.some((intent) => intent === value);
}
