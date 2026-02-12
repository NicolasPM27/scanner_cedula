import type { AuthUser } from '../../middleware/auth.middleware';

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export {};
