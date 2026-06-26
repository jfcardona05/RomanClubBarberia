# Backend Roman Club Barbería — incluye Chromium para WhatsApp Web (whatsapp-web.js)
FROM node:20-slim

# Chromium + librerías que necesita para arrancar dentro del contenedor
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates fonts-liberation \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libgbm1 \
    libgtk-3-0 libasound2 libxcomposite1 libxdamage1 libxrandr2 \
    libxkbcommon0 libpango-1.0-0 libxshmfence1 \
  && rm -rf /var/lib/apt/lists/*

# Usar el Chromium del sistema (no descargar el de puppeteer)
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 4000
CMD ["npm", "start"]
