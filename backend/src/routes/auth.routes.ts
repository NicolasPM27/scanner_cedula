import { Router } from 'express';
import { getCurrentUser, requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/auth/me
 * Retorna información del usuario autenticado
 */
router.get('/me', requireAuth, (req, res) => {
  const user = getCurrentUser(req);
  if (!user) {
    res.status(401).json({
      authenticated: false,
      error: 'No autenticado',
    });
    return;
  }

  res.json({
    authenticated: true,
    user,
  });
});

export { router as authRoutes };
