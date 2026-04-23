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

export function getPrimaryImageUrl(
  value: string | string[] | null | undefined
): string | null {
  return parseImageUrls(value)[0] ?? null;
}

export function shouldUnoptimizeImage(src?: string | null): boolean {
  return Boolean(src?.startsWith('data:'));
}

export function withImageFields<T extends { images?: string | string[] | null }>(
  entity: T
): T & { imageUrls: string[]; primaryImageUrl: string | null } {
  const imageUrls = parseImageUrls(entity.images);

  return {
    ...entity,
    imageUrls,
    primaryImageUrl: imageUrls[0] ?? null,
  };
}
