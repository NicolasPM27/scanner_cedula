import { NextFunction, Request, Response } from 'express';
import jwt, { JwtHeader, JwtPayload, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export interface AuthUser {
  oid: string;
  tenantId: string;
  name: string;
  username: string;
  email: string;
  roles: string[];
  isMock?: boolean;
}

interface AzureJwtPayload extends JwtPayload {
  oid?: string;
  tid?: string;
  name?: string;
  preferred_username?: string;
  upn?: string;
  roles?: string[] | string;
  role?: string[] | string;
}

const jwksClients = new Map<string, jwksClient.JwksClient>();

function isAzureEnabled(): boolean {
  return process.env.AZURE_ENABLED === 'true';
}

function getTenantId(): string {
  return process.env.AZURE_TENANT_ID || '';
}

function getApiClientId(): string {
  return process.env.AZURE_CLIENT_ID || '';
}

function getJwksClientForTenant(tenantId: string): jwksClient.JwksClient {
  const existing = jwksClients.get(tenantId);
  if (existing) {
    return existing;
  }

  const client = jwksClient({
    jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
    cache: true,
    cacheMaxAge: 60 * 60 * 1000,
    cacheMaxEntries: 10,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  jwksClients.set(tenantId, client);
  return client;
}

function normalizeRoles(payload: AzureJwtPayload): string[] {
  const rawRoles = payload.roles ?? payload.role;
  if (!rawRoles) {
    return ['User'];
  }

  if (Array.isArray(rawRoles)) {
    return rawRoles.map((role) => String(role));
  }

  return [String(rawRoles)];
}

function buildUserFromClaims(payload: AzureJwtPayload): AuthUser {
  const username = payload.preferred_username || payload.upn || 'unknown@fomag.local';
  return {
    oid: payload.oid || 'unknown-oid',
    tenantId: payload.tid || getTenantId() || 'unknown-tenant',
    name: payload.name || username,
    username,
    email: username,
    roles: normalizeRoles(payload),
  };
}

function getMockUser(): AuthUser {
  return {
    oid: 'mock-user-oid',
    tenantId: getTenantId() || 'mock-tenant',
    name: 'Mock Admin User',
    username: 'mock-admin@fomag.local',
    email: 'mock-admin@fomag.local',
    roles: ['Admin'],
    isMock: true,
  };
}

function isAuthHeaderValid(header: string | undefined): boolean {
  return !!header && header.startsWith('Bearer ');
}

function getBearerToken(header: string): string {
  return header.replace(/^Bearer\s+/i, '').trim();
}

async function verifyAzureToken(token: string): Promise<AzureJwtPayload> {
  const tenantId = getTenantId();
  const clientId = getApiClientId();

  if (!tenantId || !clientId) {
    throw new Error('Configuración de Azure incompleta: AZURE_TENANT_ID / AZURE_CLIENT_ID');
  }

  const client = getJwksClientForTenant(tenantId);

  const getKey = (header: JwtHeader, callback: SigningKeyCallback): void => {
    if (!header.kid) {
      callback(new Error('Token sin kid'), undefined);
      return;
    }

    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        callback(err, undefined);
        return;
      }

      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    });
  };

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        audience: [clientId, `api://${clientId}`],
        issuer: [
          `https://login.microsoftonline.com/${tenantId}/v2.0`,
          `https://sts.windows.net/${tenantId}/`,
        ],
      },
      (error, decoded) => {
        if (error) {
          reject(error);
          return;
        }

        if (!decoded || typeof decoded === 'string') {
          reject(new Error('Token inválido'));
          return;
        }

        resolve(decoded as AzureJwtPayload);
      }
    );
  });
}

async function resolveUserFromRequest(req: Request): Promise<AuthUser> {
  if (!isAzureEnabled()) {
    return getMockUser();
  }

  const authHeader = req.headers.authorization;
  if (!isAuthHeaderValid(authHeader)) {
    const err = new Error('Authorization header faltante o inválido');
    err.name = 'AuthHeaderError';
    throw err;
  }

  const token = getBearerToken(authHeader!);
  const claims = await verifyAzureToken(token);
  return buildUserFromClaims(claims);
}

function isAdmin(user: AuthUser): boolean {
  return user.roles.some((role) => role.toLowerCase() === 'admin');
}

function sendAuthError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'No autenticado';
  const isForbidden = message.toLowerCase().includes('forbidden');

  res.status(isForbidden ? 403 : 401).json({
    success: false,
    error: message,
  });
}

/**
 * Valida token JWT y agrega `req.authUser`.
 * En modo desarrollo con `AZURE_ENABLED=false`, inyecta usuario mock Admin.
 */
export async function validateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    req.authUser = await resolveUserFromRequest(req);
    next();
  } catch (error) {
    sendAuthError(res, error);
  }
}

/**
 * Requiere usuario autenticado.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  return validateToken(req, res, next);
}

/**
 * Requiere rol Admin.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await resolveUserFromRequest(req);
    if (!isAdmin(user)) {
      throw new Error('Forbidden: se requiere rol Admin');
    }

    req.authUser = user;
    next();
  } catch (error) {
    sendAuthError(res, error);
  }
}

/**
 * Obtiene el usuario actual del request.
 */
export function getCurrentUser(req: Request): AuthUser | null {
  if (req.authUser) {
    return req.authUser;
  }

  if (!isAzureEnabled()) {
    return getMockUser();
  }

  return null;
}
