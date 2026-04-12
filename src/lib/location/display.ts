export function getPublicLocationLabel(location?: string | null) {
  const value = location?.trim();
  if (!value) return null;

  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const city = parts[parts.length - 3] || parts[0];
    const state = parts[parts.length - 2] || parts[1] || '';

    const safeCity = city?.replace(/^\d+\s+/, '').trim();
    const safeState = state?.trim();

    if (safeCity && safeState) return `${safeCity}, ${safeState}`;
    if (safeCity) return safeCity;
  }

  const stripped = value.replace(/^\d+\s+/, '').trim();
  if (!stripped) return null;

  const firstTwo = stripped.split(',').map((part) => part.trim()).filter(Boolean).slice(0, 2);
  return firstTwo.length > 0 ? firstTwo.join(', ') : stripped;
}
