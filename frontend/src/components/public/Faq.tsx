import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ConfigSitio } from '../../types';

const NEGOCIO = 'Roman Club Barbería';

export default function Faq({ config }: { config: ConfigSitio }) {
  // Preguntas que aportan info nueva (no repiten las secciones) + nombre para SEO
  const faqs = [
    {
      q: `¿Puedo elegir el profesional que me atiende en ${NEGOCIO}?`,
      a: `¡Sí! Al reservar en ${NEGOCIO} eliges al profesional que prefieras según el servicio, y solo verás los horarios en los que está disponible.`,
    },
    {
      q: `¿Recibo confirmación y recordatorios de mi cita?`,
      a: `Sí. Al agendar en ${NEGOCIO} te llega la confirmación por WhatsApp, y además te recordamos tu cita 1 hora y 20 minutos antes para que no se te pase.`,
    },
    {
      q: `¿Puedo cancelar o reagendar mi cita?`,
      a: `Claro. Si no puedes asistir, escríbenos por WhatsApp y reprogramamos tu cita en ${NEGOCIO} sin problema. Te agradecemos avisar con tiempo para liberar el cupo.`,
    },
    {
      q: `¿Con cuánta anticipación debo reservar?`,
      a: `Puedes reservar el mismo día si hay cupo, pero en ${NEGOCIO} recomendamos agendar con uno o dos días de anticipación, sobre todo en fines de semana, para asegurar tu horario.`,
    },
    {
      q: `¿En ${NEGOCIO} atienden barbería y uñas en el mismo lugar?`,
      a: `Sí. En ${NEGOCIO} encuentras servicios de barbería (corte, barba, cejas) y de uñas (manicure, semipermanente y diseños), cada uno con su profesional especializado.`,
    },
    {
      q: `¿Qué métodos de pago aceptan?`,
      a: `${NEGOCIO} acepta efectivo, transferencia, Nequi, Daviplata y tarjeta. Si tienes alguna duda, escríbenos por WhatsApp.`,
    },
  ];
  void config;

  const [abierta, setAbierta] = useState<number | null>(0);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-24">
      {/* Datos estructurados para Google (resultados enriquecidos) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="text-center">
        <span className="section-eyebrow">Resolvemos tus dudas</span>
        <h2 className="section-title">Preguntas frecuentes</h2>
        <p className="mx-auto mt-3 max-w-2xl text-gray-400">Todo lo que necesitas saber sobre {NEGOCIO}.</p>
      </div>

      <div className="mt-10 space-y-3">
        {faqs.map((f, i) => {
          const open = abierta === i;
          return (
            <div key={i} className="card-dark overflow-hidden">
              <button
                onClick={() => setAbierta(open ? null : i)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
              >
                <span className="font-medium text-white">{f.q}</span>
                <ChevronDown className={`h-5 w-5 flex-shrink-0 text-gold transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
              </button>
              <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm text-gray-400">{f.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
