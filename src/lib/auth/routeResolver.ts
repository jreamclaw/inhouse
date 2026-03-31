export type RoutingProfile = {
  role: string | null;
  onboarding_complete: boolean;
  vendor_onboarding_complete: boolean;
} | null;

export function resolvePostLoginRoute(profile: RoutingProfile): { destination: string; reason: string } {
  if (!profile) {
    return { destination: '/role-selection', reason: 'missing-profile' };
  }

  const { role, onboarding_complete, vendor_onboarding_complete } = profile;

  if (!role) {
    return { destination: '/role-selection', reason: 'missing-role' };
  }

  if (role === 'chef') {
    return vendor_onboarding_complete
      ? { destination: '/chef-menu', reason: 'chef-ready' }
      : { destination: '/vendor-onboarding', reason: 'chef-vendor-onboarding-incomplete' };
  }

  if (role === 'customer') {
    return onboarding_complete
      ? { destination: '/home-feed', reason: 'customer-ready' }
      : { destination: '/onboarding', reason: 'customer-onboarding-incomplete' };
  }

  return { destination: '/home-feed', reason: 'fallback-home-feed' };
}
