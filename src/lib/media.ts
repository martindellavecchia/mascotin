export function parseImageUrls(
  value: string | string[] | null | undefined
): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(
      (image): image is string => typeof image === 'string' && image.length > 0
    );
  }

  if (typeof value !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (image): image is string =>
          typeof image === 'string' && image.length > 0
      );
    }
  } catch {
    if (
      value.startsWith('http') ||
      value.startsWith('/') ||
      value.startsWith('data:')
    ) {
      return [value];
    }
  }

  return [];
}

const SAFE_DATA_IMAGE_PATTERN = /^data:image\/(?:avif|gif|jpeg|png|webp);base64,[a-z0-9+/=]+$/i;

export function isRenderableImage(source?: string | null): source is string {
  if (!source) return false;
  if (source.startsWith('/') && !source.startsWith('//')) return true;
  if (SAFE_DATA_IMAGE_PATTERN.test(source)) return true;

  try {
    const url = new URL(source);
    if (url.protocol !== 'https:') return false;

    return url.hostname === 'images.unsplash.com' || url.hostname.endsWith('.neon.tech');
  } catch {
    return false;
  }
}

export function getRenderableImageUrls(
  value: string | string[] | null | undefined
): string[] {
  return parseImageUrls(value).filter(isRenderableImage);
}

export function getPrimaryImageUrl(
  value: string | string[] | null | undefined,
  thumbnailIndex = 0
): string | null {
  const images = parseImageUrls(value);
  const preferredIndex = Number.isInteger(thumbnailIndex) ? thumbnailIndex : 0;
  const preferred = images[preferredIndex];

  if (isRenderableImage(preferred)) return preferred;

  return images.find(isRenderableImage) ?? null;
}

export function getImageUrlsWithPrimaryFirst(
  value: string | string[] | null | undefined,
  thumbnailIndex = 0
): string[] {
  const images = getRenderableImageUrls(value);
  const primary = getPrimaryImageUrl(value, thumbnailIndex);

  if (!primary) return [];

  return [primary, ...images.filter((image) => image !== primary)];
}

export function normalizePetImageSelection(
  value: string | string[] | null | undefined,
  thumbnailIndex: unknown
): { images: string[]; thumbnailIndex: number } | null {
  const images = parseImageUrls(value);

  if (
    images.length === 0 ||
    images.length > 6 ||
    images.some((image) => !isRenderableImage(image))
  ) {
    return null;
  }

  const requestedIndex =
    typeof thumbnailIndex === 'number' && Number.isInteger(thumbnailIndex)
      ? thumbnailIndex
      : 0;

  return {
    images,
    thumbnailIndex:
      requestedIndex >= 0 && requestedIndex < images.length ? requestedIndex : 0,
  };
}

export function shouldUnoptimizeImage(src?: string | null): boolean {
  return Boolean(
    src?.startsWith('data:') ||
    src?.startsWith('http://') ||
    src?.startsWith('https://')
  );
}

export function withImageFields<
  T extends {
    images?: string | string[] | null;
    thumbnailIndex?: number | null;
  }
>(
  entity: T
): T & { imageUrls: string[]; primaryImageUrl: string | null } {
  const imageUrls = getRenderableImageUrls(entity.images);

  return {
    ...entity,
    imageUrls,
    primaryImageUrl: getPrimaryImageUrl(entity.images, entity.thumbnailIndex ?? 0),
  };
}
