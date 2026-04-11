const DEFAULT_WEB_URL = 'https://inhouseapp.net';
const DEFAULT_NATIVE_SCHEME = 'inhouse://';

export type AuthRedirectTarget = {
  webUrl: string;
  nativeUrl: string;
  shouldUseNativeFlow: boolean;
  platformHint: 'web' | 'capacitor';
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function getWindowOrigin() {
  if (typeof window === 'undefined') return null;
  if (!window.location?.origin) return null;
  if (window.location.origin === 'null') return null;
  return trimTrailingSlash(window.location.origin);
}

export function isCapacitorLikeRuntime() {
  if (typeof window === 'undefined') return false;
  const runtime = (window as any).Capacitor;
  if (runtime?.isNativePlatform && typeof runtime.isNativePlatform === 'function') {
    try {
      return !!runtime.isNativePlatform();
    } catch {}
  }

  const origin = window.location?.origin || '';
  return origin.startsWith('capacitor://') || origin.startsWith('ionic://');
}

export function getBaseAppUrl() {
  return getWindowOrigin() || trimTrailingSlash(process.env.NEXT_PUBLIC_APP_URL || DEFAULT_WEB_URL);
}

export function getNativeAppUrl(path = '') {
  const schemeBase = trimTrailingSlash(process.env.NEXT_PUBLIC_CAPACITOR_REDIRECT_SCHEME || DEFAULT_NATIVE_SCHEME);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${schemeBase}${normalizedPath}`;
}

export function getAuthRedirectTarget(path: string): AuthRedirectTarget {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const webUrl = `${getBaseAppUrl()}${normalizedPath}`;
  const nativeUrl = getNativeAppUrl(normalizedPath);
  const shouldUseNativeFlow = isCapacitorLikeRuntime();

  return {
    webUrl,
    nativeUrl,
    shouldUseNativeFlow,
    platformHint: shouldUseNativeFlow ? 'capacitor' : 'web',
  };
}

export function getPreferredAuthRedirectUrl(path: string) {
  const target = getAuthRedirectTarget(path);
  return target.shouldUseNativeFlow ? target.nativeUrl : target.webUrl;
}

export function getOAuthCallbackRedirect(provider: 'google' | 'apple') {
  const target = getAuthRedirectTarget(provider === 'google' ? '/oauth-complete' : '/auth/callback');
  const query = provider === 'google' ? '' : '?next=role-based';

  return {
    redirectTo: `${target.webUrl}${query}`,
    handoffToNative: target.shouldUseNativeFlow,
    nativeUrl: `${target.nativeUrl}${query}`,
    webUrl: `${target.webUrl}${query}`,
  };
}
