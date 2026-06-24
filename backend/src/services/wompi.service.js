// Integración con Wompi (pasarela de pagos Colombia).
// Web Checkout (redirección) con firma de integridad, y confirmación consultando
// la API de Wompi (funciona también sin webhook, ideal en local).
import crypto from 'crypto';

const ENV = process.env.WOMPI_ENV || 'sandbox';
const API_URL = process.env.WOMPI_API_URL ||
  (ENV === 'production' ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1');
const CHECKOUT_URL = 'https://checkout.wompi.co/p/';

const PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY || '';
const PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY || '';
const INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET || '';
const EVENTS_SECRET = process.env.WOMPI_EVENTS_SECRET || '';

export const ABONO_PORCENTAJE = Number(process.env.ABONO_PORCENTAJE) || 20;

export function pagosHabilitados() {
  return (
    String(process.env.PAGOS_HABILITADOS).toLowerCase() === 'true' &&
    PUBLIC_KEY.startsWith('pub_') && !!INTEGRITY_SECRET && !PUBLIC_KEY.includes('xxxx')
  );
}

export function configPublica() {
  return { habilitados: pagosHabilitados(), abono_porcentaje: ABONO_PORCENTAJE, public_key: PUBLIC_KEY };
}

// Firma de integridad: SHA256(referencia + monto + moneda + secreto)
export function firmaIntegridad(referencia, montoEnCentavos, moneda = 'COP') {
  return crypto.createHash('sha256')
    .update(`${referencia}${montoEnCentavos}${moneda}${INTEGRITY_SECRET}`)
    .digest('hex');
}

// URL del Web Checkout de Wompi.
// OJO: los nombres con ":" (signature:integrity, customer-data:email) deben ir
// LITERALES; por eso armamos el query a mano y NO usamos URLSearchParams (que
// codifica los ":" y hace que Wompi rechace la firma → error 403).
export function construirCheckoutUrl({ referencia, montoEnCentavos, redirectUrl, email, nombre, telefono }) {
  const partes = [
    `public-key=${encodeURIComponent(PUBLIC_KEY)}`,
    `currency=COP`,
    `amount-in-cents=${montoEnCentavos}`,
    `reference=${encodeURIComponent(referencia)}`,
    `signature:integrity=${firmaIntegridad(referencia, montoEnCentavos)}`,
    `redirect-url=${encodeURIComponent(redirectUrl)}`,
  ];
  if (email) partes.push(`customer-data:email=${encodeURIComponent(email)}`);
  if (nombre) partes.push(`customer-data:full-name=${encodeURIComponent(nombre)}`);
  if (telefono) partes.push(`customer-data:phone-number=${encodeURIComponent(String(telefono).replace(/\D/g, ''))}`);
  return `${CHECKOUT_URL}?${partes.join('&')}`;
}

// Consulta una transacción por id (confirmación segura del lado servidor)
export async function consultarTransaccion(id) {
  const res = await fetch(`${API_URL}/transactions/${id}`, {
    headers: { Authorization: `Bearer ${PRIVATE_KEY}` },
  });
  if (!res.ok) throw new Error(`Wompi API ${res.status}`);
  const json = await res.json();
  return json.data; // { id, status, reference, amount_in_cents, payment_method_type, ... }
}

// Valida la firma del webhook (evento) de Wompi
export function validarEvento(body) {
  try {
    const props = body?.signature?.properties || [];
    const checksumRecibido = body?.signature?.checksum;
    if (!props.length || !checksumRecibido) return false;
    const valores = props.map((ruta) => ruta.split('.').reduce((o, k) => (o ? o[k] : undefined), body.data));
    const cadena = valores.join('') + body.timestamp + EVENTS_SECRET;
    const calculado = crypto.createHash('sha256').update(cadena).digest('hex');
    return calculado === checksumRecibido;
  } catch {
    return false;
  }
}
