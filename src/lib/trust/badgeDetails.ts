import { Award, BadgeCheck, ShieldCheck, Sparkles, Star, UserCheck } from 'lucide-react';
import { ChefBadgeType, TrustCredentialShape, TrustProfileShape } from './types';

export interface BadgeDetail {
  type: ChefBadgeType;
  label: string;
  shortLabel: string;
  description: string;
  icon: any;
  earned: boolean;
  requirements: string[];
  nextSteps: string[];
  className: string;
  mutedClassName: string;
}

function approvedCounts(credentials: TrustCredentialShape[]) {
  const approved = credentials.filter((credential) => credential.status === 'approved');
  return {
    approvedCredentials: approved.length,
    approvedCertificates: approved.filter((credential) => [
      'food_safety_certificate',
      'servsafe',
      'culinary_certification',
      'other_certificate',
    ].includes(credential.credential_type)).length,
    approvedLicenses: approved.filter((credential) => [
      'business_license',
      'permit',
      'insurance',
    ].includes(credential.credential_type)).length,
  };
}

export function getAllBadgeDetails(profile: TrustProfileShape, credentials: TrustCredentialShape[]): BadgeDetail[] {
  const { approvedCredentials, approvedCertificates, approvedLicenses } = approvedCounts(credentials);
  const ratingAvg = Number(profile.rating_avg || 0);
  const ratingCount = Number(profile.rating_count || 0);
  const completedOrders = Number(profile.completed_orders || 0);
  const identityReady = !!profile.email_verified && !!profile.phone_verified && !!profile.identity_verified;

  return [
    {
      type: 'verified_identity',
      label: 'Verified Identity',
      shortLabel: 'Verified',
      description: 'Chef identity has passed core platform verification checks.',
      icon: UserCheck,
      earned: identityReady,
      requirements: ['Verified email', 'Verified phone', 'Verified identity'],
      nextSteps: [
        !profile.email_verified ? 'Verify email address' : '',
        !profile.phone_verified ? 'Verify phone number' : '',
        !profile.identity_verified ? 'Complete identity verification' : '',
      ].filter(Boolean),
      className: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
      mutedClassName: 'bg-muted text-muted-foreground border border-border',
    },
    {
      type: 'certified',
      label: 'Certified',
      shortLabel: 'Certified',
      description: 'Chef has at least one approved food safety or culinary certificate on file.',
      icon: BadgeCheck,
      earned: approvedCertificates >= 1,
      requirements: ['At least 1 approved certificate'],
      nextSteps: approvedCertificates >= 1 ? [] : ['Upload and get 1 certificate approved'],
      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
      mutedClassName: 'bg-muted text-muted-foreground border border-border',
    },
    {
      type: 'licensed_business',
      label: 'Licensed Business',
      shortLabel: 'Licensed',
      description: 'Chef has an approved business license, permit, or insurance record on file.',
      icon: ShieldCheck,
      earned: approvedLicenses >= 1,
      requirements: ['At least 1 approved license, permit, or insurance document'],
      nextSteps: approvedLicenses >= 1 ? [] : ['Upload a license, permit, or insurance document'],
      className: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
      mutedClassName: 'bg-muted text-muted-foreground border border-border',
    },
    {
      type: 'top_rated',
      label: 'Top Rated',
      shortLabel: 'Top Rated',
      description: 'Chef consistently earns strong customer ratings at meaningful review volume.',
      icon: Star,
      earned: ratingCount >= 10 && ratingAvg >= 4.7,
      requirements: ['At least 10 ratings', 'Average rating of 4.7 or higher'],
      nextSteps: [
        ratingCount < 10 ? `Get ${10 - ratingCount} more ratings` : '',
        ratingAvg < 4.7 ? 'Raise average rating to 4.7+' : '',
      ].filter(Boolean),
      className: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
      mutedClassName: 'bg-muted text-muted-foreground border border-border',
    },
    {
      type: 'pro_chef',
      label: 'Pro Chef',
      shortLabel: 'Pro',
      description: 'Chef has strong trust signals across identity, credentials, ratings, and order history.',
      icon: Sparkles,
      earned: !!profile.identity_verified && approvedCredentials >= 2 && completedOrders >= 15 && ratingAvg >= 4.7,
      requirements: ['Identity verified', 'At least 2 approved credentials', 'At least 15 completed orders', 'Average rating of 4.7 or higher'],
      nextSteps: [
        !profile.identity_verified ? 'Complete identity verification' : '',
        approvedCredentials < 2 ? `Get ${2 - approvedCredentials} more approved credentials` : '',
        completedOrders < 15 ? `Complete ${15 - completedOrders} more orders` : '',
        ratingAvg < 4.7 ? 'Raise average rating to 4.7+' : '',
      ].filter(Boolean),
      className: 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20',
      mutedClassName: 'bg-muted text-muted-foreground border border-border',
    },
    {
      type: 'new_chef',
      label: 'New Chef',
      shortLabel: 'New',
      description: 'Chef is early in their order history and still building marketplace trust.',
      icon: Award,
      earned: completedOrders < 15,
      requirements: ['Fewer than 15 completed orders'],
      nextSteps: completedOrders < 15 ? ['Keep completing orders to unlock higher-tier badges'] : ['This badge rolls off after 15 completed orders'],
      className: 'bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
      mutedClassName: 'bg-muted text-muted-foreground border border-border',
    },
  ];
}
