import { useEffect, useRef, useState } from 'react';
import { MessageCircle, CheckCircle2, RefreshCw, QrCode } from 'lucide-react';
import { whatsappApi } from '../../services';
import { getApiError } from '../../services/api';
import { useToast } from '../../components/Toast';
import { Button, Card, LoadingSpinner } from '../../components/ui';

export default function WhatsappPage() {
  const toast = useToast();
  const [estado, setEstado] = useState<{ conectado: boolean; qr: string | null; iniciando: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconectando, setReconectando] = useState(false);
  const timer = useRef<number | null>(null);

  const cargar = async () => {
    try {
      const e = await whatsappApi.estado();
      setEstado(e);
    } catch (err) { toast.error(getApiError(err)); }
    finally { setLoading(false); }
  };

  // Refresca cada 4s para ver el QR / cambio de estado en vivo
  useEffect(() => {
    cargar();
    timer.current = window.setInterval(cargar, 4000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const reconectar = async () => {
    setReconectando(true);
    try {
      await whatsappApi.reconectar();
      toast.success('Sesión reiniciada. Espera el nuevo QR.');
      setTimeout(cargar, 1500);
    } catch (err) { toast.error(getApiError(err)); }
    finally { setReconectando(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-white">
          <MessageCircle className="h-6 w-6 text-green-400" /> WhatsApp
        </h1>
        <p className="text-sm text-gray-400">Conecta el WhatsApp del negocio para enviar confirmaciones y recordatorios automáticos</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Estado / QR */}
        <Card className="flex flex-col items-center justify-center text-center">
          {estado?.conectado ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-green-400"><CheckCircle2 className="h-8 w-8" /></div>
              <h3 className="mt-4 font-display text-xl font-semibold text-white">WhatsApp conectado</h3>
              <p className="mt-1 text-sm text-gray-400">Los mensajes automáticos están activos.</p>
              <Button variant="outline" className="mt-6" loading={reconectando} onClick={reconectar}>
                <RefreshCw className="h-4 w-4" /> Vincular otro número
              </Button>
            </>
          ) : estado?.qr ? (
            <>
              <h3 className="mb-1 font-display text-lg font-semibold text-white">Escanea el código</h3>
              <p className="mb-4 text-xs text-gray-400">WhatsApp del barbero → Dispositivos vinculados → Vincular dispositivo</p>
              <img src={estado.qr} alt="QR de WhatsApp" className="h-60 w-60 rounded-xl bg-white p-2" />
              <p className="mt-3 text-xs text-gray-500">El código se actualiza solo.</p>
            </>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 text-gold"><QrCode className="h-8 w-8" /></div>
              <h3 className="mt-4 font-display text-lg font-semibold text-white">Generando código QR…</h3>
              <p className="mt-1 text-sm text-gray-400">Espera unos segundos. Si no aparece, reinicia el servidor del backend.</p>
            </>
          )}
        </Card>

        {/* Instrucciones */}
        <Card>
          <h3 className="mb-3 font-display text-lg font-semibold text-gold">¿Cómo funciona?</h3>
          <ol className="space-y-3 text-sm text-gray-300">
            <li><span className="mr-2 font-bold text-gold">1.</span> En el celular del barbero abre <b>WhatsApp</b>.</li>
            <li><span className="mr-2 font-bold text-gold">2.</span> Ve a <b>Ajustes → Dispositivos vinculados → Vincular un dispositivo</b>.</li>
            <li><span className="mr-2 font-bold text-gold">3.</span> Escanea el <b>QR</b> de la izquierda. Quedará conectado.</li>
            <li><span className="mr-2 font-bold text-gold">4.</span> Listo: cada cita envía <b>confirmación</b>, y recordatorios <b>1 hora</b> y <b>20 minutos</b> antes.</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
