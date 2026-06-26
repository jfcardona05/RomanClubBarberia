// Servicio de WhatsApp usando whatsapp-web.js (sesión del barbero, gratis).
// Mantiene una única sesión persistente (LocalAuth) y expone enviar/estado.
import wweb from 'whatsapp-web.js';
import QRCode from 'qrcode';

const { Client, LocalAuth } = wweb;

let client = null;
let conectado = false;
let ultimoQr = null;   // dataURL del QR para mostrar en el panel
let iniciando = false;

// Normaliza un teléfono colombiano a solo dígitos con indicativo: 57XXXXXXXXXX
export function normalizarTelefono(tel) {
  if (!tel) return null;
  let d = String(tel).replace(/\D/g, ''); // solo dígitos
  if (d.startsWith('057')) d = d.slice(1);
  if (d.length === 10) d = '57' + d;       // celular sin indicativo
  if (d.length < 11) return null;          // número inválido
  return d;
}

export function getEstado() {
  return { conectado, qr: conectado ? null : ultimoQr, iniciando };
}

// Arranca el cliente (idempotente). No tumba el servidor si falla.
export function iniciarWhatsapp() {
  if (client || iniciando) return;
  iniciando = true;
  try {
    client = new Client({
      // dataPath: en producción apunta a un volumen para no perder la sesión al redeployar
      authStrategy: new LocalAuth({ clientId: 'roman-club', dataPath: process.env.WWEBJS_PATH || undefined }),
      puppeteer: {
        headless: true,
        // executablePath: en Railway/Docker usa el Chromium del sistema (PUPPETEER_EXECUTABLE_PATH)
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
          '--disable-gpu', '--no-zygote', '--single-process',
        ],
      },
    });

    client.on('qr', async (qr) => {
      try { ultimoQr = await QRCode.toDataURL(qr); } catch { /* ignore */ }
      conectado = false;
      console.log('📱 WhatsApp: escanea el QR desde el panel (Admin → WhatsApp)');
    });

    client.on('ready', () => {
      conectado = true;
      ultimoQr = null;
      console.log('✅ WhatsApp conectado y listo para enviar mensajes');
    });

    client.on('authenticated', () => { ultimoQr = null; });

    client.on('disconnected', async () => {
      conectado = false;
      console.log('⚠️ WhatsApp se desconectó, intentando reconectar…');
      try { await client.destroy(); } catch { /* ignore */ }
      client = null;
      iniciando = false;
      // Reintenta: si la sesión sigue válida reconecta sin QR; si no, muestra QR
      setTimeout(() => iniciarWhatsapp(), 5000);
    });

    client.initialize().catch((e) => {
      iniciando = false;
      console.error('❌ No se pudo iniciar WhatsApp:', e.message);
    });
  } catch (e) {
    iniciando = false;
    console.error('❌ Error creando cliente de WhatsApp:', e.message);
  }
}

// Cierra la sesión actual (para vincular otro número)
export async function cerrarSesionWhatsapp() {
  if (!client) return;
  try { await client.logout(); } catch { /* ignore */ }
  try { await client.destroy(); } catch { /* ignore */ }
  client = null;
  conectado = false;
  ultimoQr = null;
  iniciando = false;
  iniciarWhatsapp();
}

// ============================================================
//  ANTI-BLOQUEO: cola de envío con espaciado humano
//  - Los mensajes salen DE A UNO, nunca en ráfaga.
//  - Pausa aleatoria de 12–30 s entre mensajes.
//  - Simula "escribiendo…" antes de enviar.
//  - Tope de seguridad de mensajes por hora.
// ============================================================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const aleatorio = (min, max) => Math.floor(min + Math.random() * (max - min));

const cola = [];
let procesando = false;
let enviadosEstaHora = [];          // timestamps de envíos (para tope por hora)
const TOPE_POR_HORA = 40;           // máximo de mensajes/hora (margen de sobra para una barbería)

async function enviarAhora(num, texto) {
  // Verifica que el número exista en WhatsApp y obtiene su id real
  const numberId = await client.getNumberId(num);
  if (!numberId) { console.warn('⚠️ WhatsApp: el número no tiene WhatsApp:', num); return false; }
  const chatId = numberId._serialized;

  // Simula presencia + "escribiendo…" como una persona real
  try {
    const chat = await client.getChatById(chatId);
    await client.sendPresenceAvailable();
    await chat.sendStateTyping();
    await sleep(aleatorio(2000, 5000));
  } catch { /* no crítico */ }

  await client.sendMessage(chatId, texto);
  console.log(`📤 WhatsApp enviado a ${num}`);
  return true;
}

async function procesarCola() {
  if (procesando) return;
  procesando = true;
  while (cola.length) {
    // Respeta el tope por hora
    const haceUnaHora = Date.now() - 60 * 60 * 1000;
    enviadosEstaHora = enviadosEstaHora.filter((t) => t > haceUnaHora);
    if (enviadosEstaHora.length >= TOPE_POR_HORA) {
      console.warn('⚠️ WhatsApp: tope por hora alcanzado, esperando…');
      await sleep(5 * 60 * 1000); // espera 5 min y reintenta
      continue;
    }

    const item = cola.shift();
    let ok = false;
    if (conectado && client) {
      try { ok = await enviarAhora(item.num, item.texto); }
      catch (e) { console.error('❌ Error enviando WhatsApp:', e.message); }
    }
    if (ok) enviadosEstaHora.push(Date.now());
    item.resolve(ok);

    // Pausa humana entre mensajes (nunca en ráfaga)
    if (cola.length) await sleep(aleatorio(12000, 30000));
  }
  procesando = false;
}

// Encola un mensaje AL CLIENTE. Devuelve una promesa true/false (cuando realmente se envía).
export function enviarWhatsapp(telefono, texto) {
  return new Promise((resolve) => {
    if (!conectado || !client) return resolve(false);
    const num = normalizarTelefono(telefono);
    if (!num) { console.warn('⚠️ WhatsApp: teléfono inválido:', telefono); return resolve(false); }
    cola.push({ num, texto, resolve });
    procesarCola();
  });
}
