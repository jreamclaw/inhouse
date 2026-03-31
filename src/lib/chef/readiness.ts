export type ChefReadinessInput = {
  full_name?: string | null;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  location?: string | null;
  vendor_onboarding_complete?: boolean | null;
  delivery_enabled?: boolean | null;
  delivery_fee?: number | null;
  stripe_account_id?: string | null;
  stripe_onboarding_complete?: boolean | null;
  stripe_charges_enabled?: boolean | null;
  stripe_payouts_enabled?: boolean | null;
  cuisine_types?: string[] | null;
  business_hours?: string | null;
  mealCount?: number;
};

export type ChefReadinessItem = {
  key: string;
  label: string;
  complete: boolean;
  ctaLabel: string;
  ctaHref: string;
};

export type ChefReadinessResult = {
  status: 'incomplete' | 'nearly-ready' | 'ready';
  completedCount: number;
  totalCount: number;
  percent: number;
  items: ChefReadinessItem[];
};

export function getChefReadiness(input: ChefReadinessInput): ChefReadinessResult {
  const items: ChefReadinessItem[] = [
    {
      key: 'identity',
      label: 'Business name and username',
      complete: Boolean(input.full_name?.trim() && input.username?.trim()),
      ctaLabel: 'Edit Profile',
      ctaHref: '/edit-profile',
    },
    {
      key: 'bio-media',
      label: 'Bio, photo, and cover image',
      complete: Boolean(input.bio?.trim() && input.avatar_url && input.cover_url),
      ctaLabel: 'Complete Profile Media',
      ctaHref: '/edit-profile',
    },
    {
      key: 'location',
      label: 'Location / service area',
      complete: Boolean(input.location?.trim()),
      ctaLabel: 'Set Location',
      ctaHref: '/vendor-onboarding',
    },
    {
      key: 'vendor-setup',
      label: 'Vendor profile setup',
      complete: Boolean(input.vendor_onboarding_complete),
      ctaLabel: 'Complete Vendor Setup',
      ctaHref: '/vendor-onboarding',
    },
    {
      key: 'menu',
      label: 'At least one menu item',
      complete: (input.mealCount ?? 0) > 0,
      ctaLabel: 'Add First Meal',
      ctaHref: '/chef-menu',
    },
    {
      key: 'payouts',
      label: 'Payout setup',
      complete: Boolean(input.stripe_account_id && input.stripe_onboarding_complete && input.stripe_charges_enabled && input.stripe_payouts_enabled),
      ctaLabel: 'Connect Payouts',
      ctaHref: '/chef-menu',
    },
  ];

  const completedCount = items.filter((item) => item.complete).length;
  const totalCount = items.length;
  const percent = Math.round((completedCount / totalCount) * 100);

  let status: ChefReadinessResult['status'] = 'incomplete';
  if (completedCount === totalCount) status = 'ready';
  else if (completedCount >= totalCount - 2) status = 'nearly-ready';

  return { status, completedCount, totalCount, percent, items };
}
