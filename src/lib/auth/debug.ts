export type AuthDebugPayload = {
  pathname: string;
  sessionExists: boolean;
  userId: string | null;
  profileRole: string | null;
  onboardingComplete: boolean | null;
  vendorOnboardingComplete: boolean | null;
  redirectTarget: string | null;
  reason?: string | null;
  [key: string]: unknown;
};

export function authDebug(scope: string, payload: AuthDebugPayload) {
  console.log(`[AUTH_DEBUG] ${scope}`, JSON.stringify(payload));
}
