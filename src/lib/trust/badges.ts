import { ChefBadgeType, TrustCredentialShape, TrustProfileShape } from './types';

function getApprovedCounts(credentials: TrustCredentialShape[]) {
  const approved = credentials.filter((credential) => credential.status === 'approved');
  const approvedCertificates = approved.filter((credential) => [
    'food_safety_certificate',
    'servsafe',
    'culinary_certification',
    'other_certificate',
  ].includes(credential.credential_type)).length;
  const approvedLicenses = approved.filter((credential) => [
    'business_license',
    'permit',
    'insurance',
  ].includes(credential.credential_type)).length;

  return {
    approvedCredentials: approved.length,
    approvedCertificates,
    approvedLicenses,
  };
}

export function getChefBadges(profile: TrustProfileShape, credentials: TrustCredentialShape[]): ChefBadgeType[] {
  const { approvedCredentials, approvedCertificates, approvedLicenses } = getApprovedCounts(credentials);
  const ratingAvg = Number(profile.rating_avg || 0);
  const ratingCount = Number(profile.rating_count || 0);
  const completedOrders = Number(profile.completed_orders || 0);

  const badges: ChefBadgeType[] = [];

  if (profile.email_verified && profile.phone_verified && profile.identity_verified) {
    badges.push('verified_identity');
  }

  if (approvedCertificates >= 1) {
    badges.push('certified');
  }

  if (approvedLicenses >= 1) {
    badges.push('licensed_business');
  }

  if (ratingCount >= 10 && ratingAvg >= 4.7) {
    badges.push('top_rated');
  }

  if (profile.identity_verified && approvedCredentials >= 2 && completedOrders >= 15 && ratingAvg >= 4.7) {
    badges.push('pro_chef');
  }

  if (completedOrders < 15) {
    badges.push('new_chef');
  }

  return badges;
}

export function getApprovedCredentialCounts(credentials: TrustCredentialShape[]) {
  return getApprovedCounts(credentials);
}
