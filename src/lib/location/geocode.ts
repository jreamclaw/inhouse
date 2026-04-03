export interface ReverseGeocodeResult {
  fullAddress: string;
  shortLabel: string;
}

function buildShortLabel(parts: Record<string, any>) {
  const houseNumber = parts.house_number || '';
  const road = parts.road || parts.pedestrian || parts.neighbourhood || '';
  const fallback = parts.suburb || parts.city || parts.town || parts.village || 'Current location';
  const street = `${houseNumber} ${road}`.trim();
  return street || fallback;
}

function buildFullAddress(parts: Record<string, any>, displayName?: string) {
  const houseNumber = parts.house_number || '';
  const road = parts.road || parts.pedestrian || '';
  const city = parts.city || parts.town || parts.village || parts.hamlet || parts.county || '';
  const state = parts.state || '';
  const postcode = parts.postcode || '';

  const line1 = `${houseNumber} ${road}`.trim();
  const line2 = [city, state, postcode].filter(Boolean).join(', ').replace(', ,', ',');
  const full = [line1, line2].filter(Boolean).join(', ');
  return full || displayName || 'Current location';
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) return null;
    const data = await response.json();
    const parts = data?.address || {};

    return {
      fullAddress: buildFullAddress(parts, data?.display_name),
      shortLabel: buildShortLabel(parts),
    };
  } catch {
    return null;
  }
}
