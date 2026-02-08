import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ════════════════════════════════════════════════════════════
// Middleware de subida de archivos (multer)
// ════════════════════════════════════════════════════════════

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

// Crear directorio si no existe
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}-${sanitized}`);
  },
});

/** Filtro: solo acepta Excel y CSV */
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel',                                          // .xls
    'text/csv',
    'text/tab-separated-values',
    'application/octet-stream', // fallback para archivos sin MIME
  ];
  const allowedExts = ['.xlsx', '.xls', '.csv', '.tsv'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Formato no soportado: ${ext}. Use .xlsx, .xls, .csv o .tsv`));
  }
};

/**
 * Middleware de upload para un solo archivo.
 * Campo esperado: "file" (max 20 MB)
 */
export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
}).single('file');

export { UPLOAD_DIR };
