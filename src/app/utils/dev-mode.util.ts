import { environment } from '../../environments/environment';

const DEV_STORAGE_KEY = 'fomag_dev_mode';

function isDevHost(host: string): boolean {
  // Local development
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
    return true;
  }
  // ngrok, localtunnel, and other tunneling services (development domains)
  if (host.includes('ngrok') || host.includes('localhost.run') || host.includes('loca.lt')) {
    return true;
  }
  // Docker container names or internal IPs (172.16.0.0/12, 192.168.0.0/16)
  if (/^(172\.(1[6-9]|2[0-9]|3[01])|192\.168|10\.)\d+\.\d+\.\d+$/.test(host)) {
    return true;
  }
  return false;
}

function readDevQueryOverride(search: string): 'on' | 'off' | 'none' {
  const value = new URLSearchParams(search).get('dev')?.toLowerCase();

  if (value === '1' || value === 'true') return 'on';
  if (value === '0' || value === 'false') return 'off';
  return 'none';
}

export function isDevModeEnabled(): boolean {
  if (typeof window === 'undefined') {
    return !environment.production;
  }

  const override = readDevQueryOverride(window.location.search);

  if (override === 'on') {
    try {
      window.localStorage.setItem(DEV_STORAGE_KEY, '1');
    } catch {
      // ignore localStorage errors
    }
    return true;
  }

  if (override === 'off') {
    try {
      window.localStorage.removeItem(DEV_STORAGE_KEY);
    } catch {
      // ignore localStorage errors
    }
    return !environment.production || isDevHost(window.location.hostname);
  }

  let persistedOverride = false;
  try {
    persistedOverride = window.localStorage.getItem(DEV_STORAGE_KEY) === '1';
  } catch {
    persistedOverride = false;
  }

  return !environment.production || isDevHost(window.location.hostname) || persistedOverride;
}
