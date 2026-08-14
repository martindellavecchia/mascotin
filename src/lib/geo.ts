export interface GeoPoint {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;

export function isValidCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function toGeoPoint(
  latitude?: number | null,
  longitude?: number | null
): GeoPoint | null {
  if (!isValidCoordinate(latitude) || !isValidCoordinate(longitude)) {
    return null;
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }
  return { latitude, longitude };
}

export function haversineKm(from: GeoPoint, to: GeoPoint): number {
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinRadius(
  from: GeoPoint,
  to: GeoPoint,
  radiusKm: number
): boolean {
  return haversineKm(from, to) <= radiusKm;
}

export function locationsShareZone(
  left?: string | null,
  right?: string | null
): boolean {
  if (!left || !right) return false;
  const leftZone = left.split(',')[0].trim().toLowerCase();
  const rightZone = right.trim().toLowerCase();
  if (!leftZone || leftZone.length < 2) return false;
  return rightZone.includes(leftZone) || leftZone.includes(rightZone.split(',')[0].trim());
}

export async function geocodeAddress(
  address: string
): Promise<GeoPoint | null> {
  const query = address.trim();
  if (query.length < 2) return null;

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'MascoTin/1.0 (pet-social-app)',
        Accept: 'application/json',
      },
    });

    if (!response.ok) return null;

    const results = (await response.json()) as Array<{ lat?: string; lon?: string }>;
    const first = results[0];
    if (!first?.lat || !first?.lon) return null;

    return toGeoPoint(Number(first.lat), Number(first.lon));
  } catch {
    return null;
  }
}
