import { BrowserCacheLocation, Configuration, RedirectRequest } from '@azure/msal-browser';
import { environment } from '../../environments/environment';

function getCurrentOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost:4200';
}

function buildApiScope(): string {
  if (environment.azureApiScope) {
    return environment.azureApiScope;
  }

  if (environment.azureApiClientId) {
    return `api://${environment.azureApiClientId}/access_as_user`;
  }

  return '';
}

const currentOrigin = getCurrentOrigin();
const apiScope = buildApiScope();

export const msalConfig: Configuration = {
  auth: {
    clientId: environment.azureAppClientId || 'missing-client-id',
    authority: `https://login.microsoftonline.com/${environment.azureTenantId || 'common'}`,
    redirectUri: `${currentOrigin}`,
    postLogoutRedirectUri: `${currentOrigin}`,
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
  },
};

export const loginRequest: RedirectRequest = {
  scopes: apiScope ? [apiScope] : ['openid', 'profile', 'offline_access'],
};

export const protectedResourceMap: Record<string, string[]> = {
  '/api/': apiScope ? [apiScope] : [],
};
