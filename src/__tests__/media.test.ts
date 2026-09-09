import {
  getImageUrlsWithPrimaryFirst,
  getPrimaryImageUrl,
  isRenderableImage,
  normalizePetImageSelection,
  shouldUnoptimizeImage,
  withImageFields,
} from '@/lib/media';

describe('media helpers', () => {
  it('accepts data URLs, relative paths and known hosts', () => {
    expect(isRenderableImage('data:image/webp;base64,abc')).toBe(true);
    expect(isRenderableImage('/images/pet.png')).toBe(true);
    expect(isRenderableImage('https://images.unsplash.com/photo.jpg')).toBe(true);
    expect(isRenderableImage('https://cdn.neon.tech/pet.webp')).toBe(true);
    expect(isRenderableImage('https://evil.example/pet.png')).toBe(false);
    expect(isRenderableImage(null)).toBe(false);
  });

  it('marks data URLs as unoptimized', () => {
    expect(shouldUnoptimizeImage('data:image/webp;base64,abc')).toBe(true);
    expect(shouldUnoptimizeImage('/images/pet.png')).toBe(false);
  });

  it('uses the selected thumbnail across normalized image fields', () => {
    const images = JSON.stringify([
      '/images/first.jpg',
      'data:image/webp;base64,abc',
    ]);

    expect(getPrimaryImageUrl(images, 1)).toBe('data:image/webp;base64,abc');
    expect(getImageUrlsWithPrimaryFirst(images, 1)).toEqual([
      'data:image/webp;base64,abc',
      '/images/first.jpg',
    ]);
    const payload = withImageFields({ images, thumbnailIndex: 1 });
    expect(getPrimaryImageUrl(payload.images, payload.thumbnailIndex)).toBe('data:image/webp;base64,abc');
    expect(JSON.stringify(payload).match(/data:image\/webp;base64,abc/g)).toHaveLength(1);
    expect(payload.imageUrls).toBeUndefined();
    expect(payload.primaryImageUrl).toBeUndefined();
  });

  it('keeps derived fields for lightweight URLs and preserves the original thumbnail index', () => {
    expect(withImageFields({ images: ['/images/first.jpg', '/images/second.jpg'], thumbnailIndex: 1 })).toEqual({
      images: ['/images/first.jpg', '/images/second.jpg'], thumbnailIndex: 1,
      imageUrls: ['/images/first.jpg', '/images/second.jpg'], primaryImageUrl: '/images/second.jpg',
    });
  });

  it('removes inline copies even when the input already contains derived fields', () => {
    const source = `data:image/webp;base64,${'a'.repeat(100_000)}`;
    const original = { images: JSON.stringify([source]), thumbnailIndex: 0, imageUrls: [source], primaryImageUrl: source };
    const compact = JSON.stringify(withImageFields(original));
    expect(compact.length).toBeLessThan(JSON.stringify(original).length * 0.34);
    expect(JSON.parse(compact)).toEqual({ images: original.images, thumbnailIndex: 0 });
  });

  it('normalizes a valid pet image selection and rejects unsafe sources', () => {
    expect(
      normalizePetImageSelection(['data:image/webp;base64,abc'], 4)
    ).toEqual({
      images: ['data:image/webp;base64,abc'],
      thumbnailIndex: 0,
    });
    expect(normalizePetImageSelection(['javascript:alert(1)'], 0)).toBeNull();
    expect(isRenderableImage('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
  });
});
