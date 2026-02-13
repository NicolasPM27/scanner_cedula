import { Router } from 'express';
import { scanDocument, scanAntiguaDocument, scanNuevaDocument } from '../controllers/scan.controller';

const router = Router();

// POST /api/scan/document — Procesa imagen de documento y extrae datos (generico, auto-detect)
router.post('/document', scanDocument);

// POST /api/scan/antigua — Pipeline optimizada para cedula antigua (PDF417)
router.post('/antigua', scanAntiguaDocument);

// POST /api/scan/nueva — Pipeline optimizada para cedula nueva (MRZ)
router.post('/nueva', scanNuevaDocument);

export const scanRoutes = router;
