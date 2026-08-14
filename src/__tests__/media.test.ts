import { isRenderableImage, shouldUnoptimizeImage } from '@/lib/media';

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
});
