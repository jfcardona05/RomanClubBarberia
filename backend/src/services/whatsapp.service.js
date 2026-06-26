// Servicio de WhatsApp con Baileys (NO usa navegador/Chromium -> liviano).
// Mantiene una única sesión persistente y expone enviar/estado.
import { rm } from 'fs/promises';
import baileys, {
  useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';

// Interop CommonJS->ESM: el default export real es la función makeWASocket
const makeWASocket = baileys.default || baileys;

const logger = pino({ level: 'silent' }); // sin ruido en consola
const AUTH_DIR = process.env.WHATSAPP_AUTH_PATH || './.baileys_auth';

let sock = null;
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
  if (sock || iniciando) return;
  iniciando = true;
  arrancar().catch((e) => {
    iniciando = false;
    console.error('❌ No se pudo iniciar WhatsApp:', e.message);
  });
}

async function arrancar() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  let version;
  try { ({ version } = await fetchLatestBaileysVersion()); } catch { /* usa la por defecto */ }

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    browser: Browsers.appropriate('Chrome'),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u;

    if (qr) {
      try { ultimoQr = await QRCode.toDataURL(qr); } catch { /* ignore */ }
      conectado = false;
      console.log('📱 WhatsApp: escanea el QR desde el panel (Admin → WhatsApp)');
    }

    if (connection === 'open') {
      conectado = true;
      ultimoQr = null;
      iniciando = false;
      console.log('✅ WhatsApp conectado y listo para enviar mensajes');
    }

    if (connection === 'close') {
      conectado = false;
      sock = null;
      iniciando = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        // Sesión cerrada (desvinculada): borra credenciales y vuelve a generar QR limpio
        console.log('⚠️ WhatsApp desvinculado. Generando un QR nuevo…');
        try { await rm(AUTH_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
        setTimeout(() => iniciarWhatsapp(), 2000);
      } else {
        // Caída temporal: reconecta con la misma sesión (sin QR)
        console.log('⚠️ WhatsApp se desconectó, reintentando…');
        setTimeout(() => iniciarWhatsapp(), 4000);
      }
    }
  });
}

// Cierra la sesión actual y genera nuevo QR (para vincular otro número)
export async function cerrarSesionWhatsapp() {
  try { await sock?.logout(); } catch { /* ignore */ }
  try { sock?.end?.(); } catch { /* ignore */ }
  sock = null;
  conectado = false;
  ultimoQr = null;
  iniciando = false;
  try { await rm(AUTH_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
  setTimeout(() => iniciarWhatsapp(), 1500);
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
  // Verifica que el número exista en WhatsApp y obtiene su jid real
  const [info] = await sock.onWhatsApp(num);
  if (!info?.exists) { console.warn('⚠️ WhatsApp: el número no tiene WhatsApp:', num); return false; }
  const jid = info.jid;

  // Simula presencia + "escribiendo…" como una persona real
  try {
    await sock.presenceSubscribe(jid);
    await sock.sendPresenceUpdate('composing', jid);
    await sleep(aleatorio(2000, 5000));
    await sock.sendPresenceUpdate('paused', jid);
  } catch { /* no crítico */ }

  await sock.sendMessage(jid, { text: texto });
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
    if (conectado && sock) {
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
    if (!conectado || !sock) return resolve(false);
    const num = normalizarTelefono(telefono);
    if (!num) { console.warn('⚠️ WhatsApp: teléfono inválido:', telefono); return resolve(false); }
    cola.push({ num, texto, resolve });
    procesarCola();
  });
}
