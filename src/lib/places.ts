export const PLACE_REVIEW_CATEGORY_NAMES = [
  'Restaurante pet-friendly',
  'Plaza y parque',
] as const;

export const STORE_PLACE_TAGS = [
  'terraza',
  'indoor',
  'bebedero',
  'menu_mascotas',
  '24hs',
] as const;

export type StorePlaceTag = (typeof STORE_PLACE_TAGS)[number];

export function isPlaceReviewCategory(name?: string | null): boolean {
  if (!name) return false;
  return PLACE_REVIEW_CATEGORY_NAMES.includes(
    name as (typeof PLACE_REVIEW_CATEGORY_NAMES)[number]
  );
}

export function isFeaturedStore(plan?: string | null, featuredUntil?: Date | string | null): boolean {
  if (plan !== 'FEATURED') return false;
  if (!featuredUntil) return true;
  return new Date(featuredUntil).getTime() >= Date.now();
}
