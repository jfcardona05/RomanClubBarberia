import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// El proxy /api y /uploads evita problemas de CORS en desarrollo
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: 5173,
        // Permite abrir la app por lvh.me (apunta a 127.0.0.1) para el retorno de Wompi
        allowedHosts: ['localhost', 'lvh.me', '.lvh.me', 'localtest.me'],
        proxy: {
            '/api': 'http://localhost:4000',
            '/uploads': 'http://localhost:4000',
        },
    },
});
