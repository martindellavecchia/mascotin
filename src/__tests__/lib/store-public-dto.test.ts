import { readFileSync } from 'fs';
import path from 'path';
import {
  buildStoreDetailSelect,
  mapPublicStoreDetail,
  PUBLIC_STORE_CARD_KEYS,
  toPublicStoreCard,
  type PublicStoreCard,
} from '@/lib/server/stores';

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('public store DTOs', () => {
  it('maps directory cards to exactly PublicStoreCard keys', () => {
    const card = toPublicStoreCard({
      id: 'store-1',
      name: 'Paw Spa',
      slug: 'paw-spa',
      description: 'Baño',
      address: 'Palermo',
      image: null,
      category: { id: 'cat-1', name: 'Peluquería' },
      ratingAverage: 4.8,
      reviewCount: 12,
      trust: {
        level: 'HIGHLY_RECOMMENDED',
        label: 'Muy recomendado',
        description: 'ok',
        tone: 'emerald',
      },
      services: [{ id: 'svc-1', name: 'Baño', price: 8000, duration: 60 }],
    } satisfies PublicStoreCard);

    expect(Object.keys(card).sort()).toEqual([...PUBLIC_STORE_CARD_KEYS].sort());
    expect(card).not.toHaveProperty('latitude');
    expect(card).not.toHaveProperty('longitude');
    expect(card).not.toHaveProperty('owner');
    expect(card).not.toHaveProperty('promotions');
    expect(card).not.toHaveProperty('weightedScore');
    expect(card).not.toHaveProperty('images');
    expect(card).not.toHaveProperty('tags');
    expect(card).not.toHaveProperty('plan');
    expect(card).not.toHaveProperty('featured');
    expect(card).not.toHaveProperty('distanceKm');
    expect(card).not.toHaveProperty('provider');
  });

  it('maps detail helpfulCount from _count and omits sensitive fields', () => {
    const detail = mapPublicStoreDetail({
      id: 'store-1',
      name: 'Paw Spa',
      slug: 'paw-spa',
      description: 'Baño',
      address: 'Palermo',
      phone: null,
      email: null,
      latitude: null,
      longitude: null,
      image: null,
      images: '[]',
      tags: '[]',
      ratingAverage: 4.5,
      reviewCount: 1,
      category: { id: 'cat-1', name: 'Peluquería' },
      promotions: [],
      bookingServices: [
        { id: 'svc-1', name: 'Baño', description: 'Completo', price: 8000, duration: 60 },
      ],
      reviews: [
        {
          id: 'rev-1',
          rating: 5,
          comment: 'Excelente',
          businessReply: null,
          businessReplyAt: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          author: {
            name: 'Ana',
            image: null,
            owner: null,
            stores: [],
          },
          _count: { helpfulVotes: 3 },
        },
      ],
    });

    expect(detail.reviews[0].helpfulCount).toBe(3);
    expect(detail.phone).toBeNull();
    expect(detail.email).toBeNull();
    expect(detail.promotions).toEqual([]);
    expect(detail).not.toHaveProperty('owner');
    expect(detail).not.toHaveProperty('providerId');
    expect(detail.reviews[0]).not.toHaveProperty('helpfulVotes');
    expect(detail.reviews[0].author).not.toHaveProperty('id');
  });

  it('exposes public contact data, coordinates and active promotions', () => {
    const startsAt = new Date('2026-09-01T00:00:00.000Z');
    const endsAt = new Date('2026-10-01T00:00:00.000Z');
    const detail = mapPublicStoreDetail({
      id: 'store-1',
      name: 'Paw Spa',
      slug: 'paw-spa',
      description: 'Baño',
      address: 'Palermo',
      phone: ' +54 9 11 5555-1234 ',
      email: ' hola@pawspa.com ',
      latitude: -34.58,
      longitude: -58.42,
      image: null,
      images: '["https://images.unsplash.com/a.jpg"]',
      tags: '[]',
      ratingAverage: 0,
      reviewCount: 0,
      category: { id: 'cat-1', name: 'Peluquería' },
      promotions: [{ id: 'promo-1', title: '20% off', body: 'En baños completos', startsAt, endsAt }],
      bookingServices: [],
      reviews: [],
    });

    expect(detail.phone).toBe('+54 9 11 5555-1234');
    expect(detail.email).toBe('hola@pawspa.com');
    expect(detail.latitude).toBe(-34.58);
    expect(detail.longitude).toBe(-58.42);
    expect(detail.images).toEqual(['https://images.unsplash.com/a.jpg']);
    expect(detail.promotions).toEqual([
      { id: 'promo-1', title: '20% off', body: 'En baños completos', startsAt, endsAt },
    ]);
  });

  it('only selects currently active promotions for the public detail', () => {
    const now = new Date('2026-09-26T12:00:00.000Z');
    const select = buildStoreDetailSelect(now);
    expect(select.promotions.where).toEqual({ startsAt: { lte: now }, endsAt: { gte: now } });
    expect(select.phone).toBe(true);
    expect(select.email).toBe(true);
  });

  it('uses _count helpfulVotes in the public detail select', () => {
    const source = readSource('src/lib/server/stores.ts');
    expect(source).toContain('_count: { select: { helpfulVotes: true } }');
    expect(source).not.toMatch(/helpfulVotes:\s*\{\s*select:\s*\{\s*userId:\s*true/);
  });

  it('scopes viewer helpful votes to the current user and store', () => {
    const source = readSource('src/lib/server/stores.ts');
    expect(source).toContain('db.reviewHelpful.findMany');
    expect(source).toContain("review: { storeId: store.id, status: 'PUBLISHED' }");
    expect(source).toContain('select: { reviewId: true }');
  });
});
