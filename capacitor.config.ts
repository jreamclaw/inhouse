import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.NEXT_PUBLIC_CAPACITOR_SERVER_URL || 'https://inhouseapp.net';
const appId = process.env.NEXT_PUBLIC_CAPACITOR_APP_ID || 'com.inhouse.app';
const appName = process.env.NEXT_PUBLIC_CAPACITOR_APP_NAME || 'InHouse';

const config: CapacitorConfig = {
  appId,
  appName,
  webDir: 'out',
  bundledWebRuntime: false,
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
    allowNavigation: [
      'inhouseapp.net',
      '*.inhouseapp.net',
      '*.supabase.co',
      '*.google.com',
      '*.googleusercontent.com',
      '*.stripe.com',
    ],
  },
  ios: {
    contentInset: 'automatic',
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
