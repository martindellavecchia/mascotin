const DISTANCE_RANGES_KM = [1, 3, 5, 10, 20, 50];
const PRECISE_DISTANCE_REASON = /^(\d+(?:\.\d+)?) km de distancia$/;

export function toDistanceRangeKm(distanceKm: number) {
  return DISTANCE_RANGES_KM.find((range) => distanceKm <= range) ?? 50;
}

export function formatDistanceReason(distanceKm: number) {
  return `Hasta ${toDistanceRangeKm(distanceKm)} km de distancia`;
}

export function coarsenOfferReasons(reasons: string[]) {
  return reasons.map((reason) => {
    const precise = reason.match(PRECISE_DISTANCE_REASON);
    return precise ? formatDistanceReason(Number(precise[1])) : reason;
  });
}

export function coarsenOfferScore(score: number) {
  return Math.round(score / 10) * 10;
}
