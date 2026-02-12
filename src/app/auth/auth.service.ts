import { Injectable, computed, signal } from '@angular/core';
import {
  AccountInfo,
  AuthenticationResult,
  PublicClientApplication,
  SilentRequest,
} from '@azure/msal-browser';
import { environment } from '../../environments/environment';
import { loginRequest, msalConfig } from './msal.config';

export interface AuthUserInfo {
  name: string;
  email: string;
  username: string;
  roles: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly enabled = environment.authEnabled;
  private readonly msalInstance = this.enabled ? new PublicClientApplication(msalConfig) : null;

  private readonly _ready = signal(false);
  private readonly _authenticated = signal(false);
  private readonly _user = signal<AuthUserInfo | null>(null);

  readonly authEnabled = computed(() => this.enabled);
  readonly isReady = this._ready.asReadonly();
  readonly isAuthenticatedSignal = this._authenticated.asReadonly();
  readonly userSignal = this._user.asReadonly();
  readonly isAdminSignal = computed(() => this.hasAdminRole(this._user()));

  async init(): Promise<void> {
    if (this._ready()) {
      return;
    }

    if (!this.enabled) {
      this._user.set({
        name: 'Mock Admin User',
        email: 'mock-admin@fomag.local',
        username: 'mock-admin@fomag.local',
        roles: ['Admin'],
      });
      this._authenticated.set(true);
      this._ready.set(true);
      return;
    }

    try {
      await this.msalInstance!.initialize();

      const redirectResult = await this.msalInstance!.handleRedirectPromise();
      if (redirectResult?.account) {
        this.msalInstance!.setActiveAccount(redirectResult.account);
      }

      const activeAccount =
        this.msalInstance!.getActiveAccount() || this.msalInstance!.getAllAccounts()[0] || null;

      if (!activeAccount) {
        this._authenticated.set(false);
        this._user.set(null);
        this._ready.set(true);
        return;
      }

      this.msalInstance!.setActiveAccount(activeAccount);
      this._authenticated.set(true);
      this._user.set(this.mapAccountToUser(activeAccount));
    } catch (error) {
      console.error('Error inicializando MSAL:', error);
      this._authenticated.set(false);
      this._user.set(null);
    } finally {
      this._ready.set(true);
    }
  }

  async login(redirectStartPage = '/settings'): Promise<void> {
    await this.init();

    if (!this.enabled) {
      return;
    }

    await this.msalInstance!.loginRedirect({
      ...loginRequest,
      redirectStartPage,
    });
  }

  async logout(): Promise<void> {
    await this.init();

    if (!this.enabled) {
      return;
    }

    await this.msalInstance!.logoutRedirect({
      postLogoutRedirectUri: msalConfig.auth.postLogoutRedirectUri,
    });
  }

  async getAccessToken(): Promise<string | null> {
    await this.init();

    if (!this.enabled) {
      return null;
    }

    const account =
      this.msalInstance!.getActiveAccount() || this.msalInstance!.getAllAccounts()[0] || null;
    if (!account) {
      return null;
    }

    const silentRequest: SilentRequest = {
      account,
      scopes: loginRequest.scopes,
    };

    try {
      const result: AuthenticationResult = await this.msalInstance!.acquireTokenSilent(
        silentRequest
      );
      return result.accessToken;
    } catch (error) {
      console.warn('No se pudo adquirir token en modo silencioso, iniciando redirect:', error);
      await this.msalInstance!.acquireTokenRedirect({
        ...silentRequest,
        redirectStartPage: '/settings',
      });
      return null;
    }
  }

  isAuthenticated(): boolean {
    return this._authenticated();
  }

  getUserInfo(): AuthUserInfo | null {
    return this._user();
  }

  isAdmin(): boolean {
    return this.hasAdminRole(this._user());
  }

  private mapAccountToUser(account: AccountInfo): AuthUserInfo {
    const claims = (account.idTokenClaims || {}) as Record<string, unknown>;
    const name = account.name || (claims['name'] as string) || account.username;
    const roles = this.extractRoles(claims);

    return {
      name,
      email: account.username,
      username: account.username,
      roles,
    };
  }

  private extractRoles(claims: Record<string, unknown>): string[] {
    const rawRoles = claims['roles'] ?? claims['role'];
    if (Array.isArray(rawRoles)) {
      return rawRoles.map((r) => String(r));
    }

    if (typeof rawRoles === 'string') {
      return [rawRoles];
    }

    return ['User'];
  }

  private hasAdminRole(user: AuthUserInfo | null): boolean {
    if (!user) {
      return false;
    }

    return user.roles.some((role) => role.toLowerCase() === 'admin');
  }
}
