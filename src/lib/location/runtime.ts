export type LocationCoords = {
  latitude: number;
  longitude: number;
};

export type RuntimeLocationSuccess = {
  coords: LocationCoords;
};

export type RuntimeLocationErrorCode = 'unsupported' | 'permission-denied' | 'unavailable' | 'unknown';

export class RuntimeLocationError extends Error {
  code: RuntimeLocationErrorCode;

  constructor(code: RuntimeLocationErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

function isCapacitorLikeRuntime() {
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

function mapBrowserGeolocationError(error?: GeolocationPositionError | null) {
  switch (error?.code) {
    case 1:
      return new RuntimeLocationError('permission-denied', 'Location access was denied.');
    case 2:
      return new RuntimeLocationError('unavailable', 'Your location could not be determined.');
    case 3:
      return new RuntimeLocationError('unavailable', 'Location request timed out.');
    default:
      return new RuntimeLocationError('unknown', 'Unable to determine your location.');
  }
}

export async function getCurrentRuntimeLocation(): Promise<RuntimeLocationSuccess> {
  if (typeof window === 'undefined') {
    throw new RuntimeLocationError('unsupported', 'Location is only available in the browser or app runtime.');
  }

  if (isCapacitorLikeRuntime()) {
    const runtime = (window as any).Capacitor;
    const plugin = runtime?.Plugins?.Geolocation;

    if (!plugin?.getCurrentPosition) {
      throw new RuntimeLocationError('unsupported', 'Native location plugin is not installed yet.');
    }

    try {
      const position = await plugin.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      return {
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
      };
    } catch (error: any) {
      const message = error?.message || 'Native location request failed.';
      if (/denied|permission/i.test(message)) {
        throw new RuntimeLocationError('permission-denied', 'Location access is denied for InHouse on this device.');
      }
      throw new RuntimeLocationError('unavailable', message);
    }
  }

  if (!navigator.geolocation) {
    throw new RuntimeLocationError('unsupported', 'Location is not supported on this device.');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        });
      },
      (error) => reject(mapBrowserGeolocationError(error)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  });
}
