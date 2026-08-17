import { getStoreTrustSummary, getWeightedStoreScore, withStoreTrustPresentation } from '@/lib/store-reputation';
import { providerCreateStoreSchema, storeReviewSchema } from '@/lib/schemas';

describe('store reputation', () => {
  it('keeps new businesses neutral until enough verified reviews exist', () => {
    expect(getStoreTrustSummary(5, 2).level).toBe('NEW');
    expect(getStoreTrustSummary(5, 2).label).toBe('Nuevo en MascoTin');
  });

  it('marks businesses as highly recommended only with volume and quality', () => {
    expect(getStoreTrustSummary(4.7, 8).level).toBe('HIGHLY_RECOMMENDED');
    expect(getStoreTrustSummary(4.7, 8).label).toBe('Muy recomendado');
    expect(withStoreTrustPresentation(getStoreTrustSummary(4.7, 8)).tone).toBe('emerald');
    expect(getStoreTrustSummary(4.1, 8).level).toBe('TRUSTED');
    expect(getStoreTrustSummary(2.8, 8).level).toBe('REVIEW_CAREFULLY');
  });

  it('uses a confidence-weighted score so a single five-star review does not dominate', () => {
    expect(getWeightedStoreScore(5, 1)).toBeLessThan(getWeightedStoreScore(4.6, 20));
  });

  it('validates a publishable business profile', () => {
    expect(providerCreateStoreSchema.safeParse({
      categoryId: 'category-1',
      name: 'Huellitas Grooming',
      description: 'Peluquería canina con atención personalizada y turnos programados.',
      email: '',
      image: '',
    }).success).toBe(true);
  });

  it('requires a meaningful comment when a review includes text', () => {
    expect(storeReviewSchema.safeParse({ rating: 5, comment: '' }).success).toBe(true);
    expect(storeReviewSchema.safeParse({ rating: 5, comment: 'Muy bueno' }).success).toBe(false);
    expect(storeReviewSchema.safeParse({
      rating: 5,
      comment: 'La atención fue puntual, cuidadosa y muy clara.',
    }).success).toBe(true);
  });
});
