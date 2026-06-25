import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/error.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// ---- CORS ----
// FRONTEND_URL admite varias URLs separadas por coma. Ej:
//   FRONTEND_URL=https://roman-club.vercel.app,https://www.romanclub.com
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, '')) // sin espacios ni "/" final
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // Sin origin = curl, apps, o webhooks (Wompi) -> permitir
    if (!origin) return cb(null, true);
    const clean = origin.replace(/\/$/, '');
    // Si no se configuró FRONTEND_URL, permite todo (útil para pruebas)
    if (allowedOrigins.length === 0) return cb(null, true);
    // Coincidencia exacta o cualquier preview *.vercel.app
    if (allowedOrigins.includes(clean) || /\.vercel\.app$/.test(new URL(clean).hostname)) {
      return cb(null, true);
    }
    return cb(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Archivos subidos (imágenes) servidos estáticamente
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Evita que el navegador cachee respuestas de la API (disponibilidad, citas, etc.)
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  next();
});

// API
app.use('/api', routes);

// 404 + errores
app.use(notFound);
app.use(errorHandler);

export default app;
