export const ADMIN_EMAILS = [
  'support@inhouseapp.net',
  'admin@inhouseapp.net',
  'inhouseappadmin@gmail.com',
] as const;

export function isAdminEmail(email?: string | null) {
  return ADMIN_EMAILS.includes((email || '').toLowerCase() as (typeof ADMIN_EMAILS)[number]);
}
