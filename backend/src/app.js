import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/error.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Middlewares base
app.use(cors({ origin: process.env.FRONTEND_URL?.split(',') || '*' }));
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
