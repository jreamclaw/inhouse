const FALLBACK_PREFIX = 'user';

function slugifyUsernameBase(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function cleanBase(value?: string | null) {
  return slugifyUsernameBase(value || '');
}

export function generateDefaultUsername(input: {
  username?: string | null;
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
  userId?: string | null;
}) {
  const explicitUsername = cleanBase(input.username);
  if (explicitUsername && !explicitUsername.startsWith(`${FALLBACK_PREFIX}_`)) {
    return explicitUsername.slice(0, 24);
  }

  const nameBase = cleanBase(input.fullName) || cleanBase(input.name);
  if (nameBase) {
    return nameBase.slice(0, 24);
  }

  const emailLocalPart = (input.email || '').split('@')[0] || '';
  const emailBase = cleanBase(emailLocalPart);
  if (emailBase && !emailBase.startsWith(`${FALLBACK_PREFIX}_`)) {
    return emailBase.slice(0, 24);
  }

  const suffix = (input.userId || '').replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 6) || 'user';
  return `${FALLBACK_PREFIX}_${suffix}`;
}
