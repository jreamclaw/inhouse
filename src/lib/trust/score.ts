import { getApprovedCredentialCounts, getChefBadges } from './badges';
import { TrustCredentialShape, TrustLabel, TrustProfileShape, TrustScoreResult } from './types';

export function getTrustLabel(score: number): TrustLabel {
  if (score >= 85) return 'Highly trusted';
  if (score >= 70) return 'Trusted chef';
  if (score >= 40) return 'Building trust';
  return 'Low trust';
}

export function isCredentialExpired(expirationDate?: string | null) {
  if (!expirationDate) return false;
  const expiration = new Date(expirationDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expiration < today;
}

export function calculateTrustScore(profile: TrustProfileShape, credentials: TrustCredentialShape[], menuPhotoCount: number): TrustScoreResult {
  const { approvedCertificates, approvedLicenses, approvedCredentials } = getApprovedCredentialCounts(credentials);
  const completedOrders = Number(profile.completed_orders || 0);
  const complaintsCount = Number(profile.complaints_count || 0);
  const ratingAvg = Number(profile.rating_avg || 0);

  const checklist = [
    { key: 'profile-photo', label: 'Profile photo added', points: 5, earned: Boolean(profile.avatar_url) },
    { key: 'bio', label: 'Bio completed', points: 5, earned: Boolean(profile.bio) },
    { key: 'menu-photos', label: '3 or more menu photos', points: 10, earned: menuPhotoCount >= 3 },
    { key: 'email-verified', label: 'Email verified', points: 10, earned: Boolean(profile.email_verified) },
    { key: 'phone-verified', label: 'Phone verified', points: 10, earned: Boolean(profile.phone_verified) },
    { key: 'identity-verified', label: 'Identity verified', points: 15, earned: Boolean(profile.identity_verified) },
    { key: 'certificate', label: 'Approved certificate on file', points: 15, earned: approvedCertificates >= 1 },
    { key: 'license', label: 'Approved license or permit on file', points: 10, earned: approvedLicenses >= 1 },
    { key: 'orders-5', label: '5+ completed orders', points: 5, earned: completedOrders >= 5 },
    { key: 'orders-10', label: '10+ completed orders', points: 5, earned: completedOrders >= 10 },
    { key: 'rating', label: '4.5+ average rating', points: 5, earned: ratingAvg >= 4.5 },
    { key: 'complaints', label: 'No complaints on record', points: 5, earned: complaintsCount === 0 },
  ];

  const score = Math.min(100, checklist.reduce((sum, item) => sum + (item.earned ? item.points : 0), 0));

  return {
    score,
    label: getTrustLabel(score),
    checklist,
    approvedCertificates,
    approvedLicenses,
    approvedCredentials,
    badges: getChefBadges(profile, credentials),
  };
}
