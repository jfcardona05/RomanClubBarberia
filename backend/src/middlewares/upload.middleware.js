import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ApiError } from '../utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Crea una carpeta de subida bajo src/uploads/<sub> si no existe
function ensureDir(sub) {
  const dir = path.join(__dirname, '..', 'uploads', sub);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Genera un middleware multer para una subcarpeta concreta (gallery, services...)
export function uploadImage(sub = 'gallery') {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ensureDir(sub)),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const base = path
        .basename(file.originalname, ext)
        .replace(/[^a-z0-9]/gi, '-')
        .toLowerCase()
        .slice(0, 40);
      const unique = `${base}-${Date.now()}${ext}`;
      cb(null, unique);
    },
  });

  const fileFilter = (_req, file, cb) => {
    const ok = /image\/(jpeg|jpg|png|webp|gif)/.test(file.mimetype);
    if (ok) return cb(null, true);
    cb(new ApiError(400, 'Solo se permiten imágenes (jpg, png, webp, gif).'));
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  });
}
