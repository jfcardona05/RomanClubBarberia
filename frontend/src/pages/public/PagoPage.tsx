import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, MessageCircle } from 'lucide-react';
import { pagosApi, configApi } from '../../services';
import type { ConfigSitio } from '../../types';
import { LoadingSpinner } from '../../components/ui';
import { formatCOP } from '../../utils/format';

type Estado = 'PAGADO' | 'ABONADO' | 'FALLIDO' | 'PENDIENTE' | 'NO_APLICA';

export default function PagoPage() {
  const [params] = useSearchParams();
  const ref = params.get('ref') || '';
  const id = params.get('id') || ''; // id de la transacción que agrega Wompi

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ estado_pago: Estado; tipo_pago?: string; monto_total: number; monto_pagado: number; saldo: number } | null>(null);
  const [config, setConfig] = useState<ConfigSitio>({});

  useEffect(() => { configApi.publica().then(setConfig).catch(() => {}); }, []);

  useEffect(() => {
    let intentos = 0;
    const resolver = async () => {
      try {
        if (id) { setData(await pagosApi.confirmar(id)); setLoading(false); return; }
        const r = await pagosApi.estado(ref);
        setData(r);
        if (r.estado_pago === 'PENDIENTE' && intentos < 5) { intentos++; setTimeout(resolver, 3000); }
        else setLoading(false);
      } catch { setLoading(false); }
    };
    if (id || ref) resolver(); else setLoading(false);
  }, [id, ref]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-ink"><LoadingSpinner label="Confirmando tu pago…" /></div>;

  const pagado = data?.estado_pago === 'PAGADO' || data?.estado_pago === 'ABONADO';
  const fallido = data?.estado_pago === 'FALLIDO';

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink p-4">
      <div className="animate-fade-up max-w-md card-dark p-8 text-center">
        {pagado ? (
          <>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15 text-green-400"><CheckCircle2 className="h-10 w-10" /></div>
            <h1 className="font-display text-2xl font-bold text-white">¡Pago confirmado!</h1>
            <p className="mt-3 text-gray-400">Tu cita quedó reservada. Te enviamos la confirmación por WhatsApp.</p>
            <div className="mt-6 space-y-1 rounded-xl border border-white/10 bg-ink-50/40 p-4 text-left text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Pagaste</span><span className="font-semibold text-gold">{formatCOP(data?.monto_pagado)}</span></div>
              {data?.estado_pago === 'ABONADO' && (
                <>
                  <div className="flex justify-between"><span className="text-gray-500">Total servicio</span><span className="text-white">{formatCOP(data?.monto_total)}</span></div>
                  <div className="flex justify-between border-t border-white/10 pt-1"><span className="text-gray-500">Saldo en el local</span><span className="font-medium text-white">{formatCOP(data?.saldo)}</span></div>
                </>
              )}
            </div>
          </>
        ) : fallido ? (
          <>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/15 text-red-400"><XCircle className="h-10 w-10" /></div>
            <h1 className="font-display text-2xl font-bold text-white">El pago no se completó</h1>
            <p className="mt-3 text-gray-400">No se pudo confirmar el pago, así que la reserva no quedó. Puedes intentar de nuevo.</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-300"><Clock className="h-10 w-10" /></div>
            <h1 className="font-display text-2xl font-bold text-white">Pago en proceso</h1>
            <p className="mt-3 text-gray-400">Estamos confirmando tu pago. Si ya pagaste, recibirás la confirmación por WhatsApp en breve.</p>
          </>
        )}
        <div className="mt-6 flex flex-col gap-3">
          {!pagado && <Link to="/reservar" className="btn-gold w-full">Intentar de nuevo</Link>}
          {config.whatsapp && <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noreferrer" className="btn-outline w-full"><MessageCircle className="h-4 w-4" /> Escríbenos por WhatsApp</a>}
          <Link to="/" className="text-sm text-gray-500 hover:text-gold">Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
