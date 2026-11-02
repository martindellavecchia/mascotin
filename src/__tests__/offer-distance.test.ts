import { coarsenOfferReasons, coarsenOfferScore, formatDistanceReason, toDistanceRangeKm } from '@/lib/offer-distance';

describe('rangos de distancia de ofertas', () => {
  it.each([
    [0.2, 1],
    [1, 1],
    [1.01, 3],
    [4.37, 5],
    [7.5, 10],
    [18, 20],
    [49.9, 50],
    [80, 50],
  ])('%f km se informa como hasta %i km', (distanceKm, range) => {
    expect(toDistanceRangeKm(distanceKm)).toBe(range);
  });

  it('reemplaza la distancia precisa de los motivos ya guardados', () => {
    expect(coarsenOfferReasons(['4.3 km de distancia', 'Acepta perros'])).toEqual([
      'Hasta 5 km de distancia',
      'Acepta perros',
    ]);
    expect(coarsenOfferReasons([formatDistanceReason(4.3)])).toEqual(['Hasta 5 km de distancia']);
  });

  it('redondea el puntaje para que no permita deducir la distancia', () => {
    expect(coarsenOfferScore(67)).toBe(70);
    expect(coarsenOfferScore(64)).toBe(60);
  });
});
