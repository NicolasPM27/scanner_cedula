import { Router } from 'express';
import { scanDocument } from '../controllers/scan.controller';

const router = Router();

// POST /api/scan/document — Procesa imagen de documento y extrae datos
router.post('/document', scanDocument);

export const scanRoutes = router;
