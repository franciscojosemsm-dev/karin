import { CheckCircle2, AlertTriangle, Clock, Info, CircleDashed } from 'lucide-react';
import type { Hito, EstadoHito } from '../lib/plazos';
import { fechaLarga } from '../lib/fechas';

const ESTILO: Record<EstadoHito, { txt: string; cls: string; Icono: typeof Clock }> = {
  cumplido: { txt: 'Cumplido', cls: 'bg-menta-f text-primario-f', Icono: CheckCircle2 },
  cumplido_tarde: { txt: 'Cumplido fuera de plazo', cls: 'bg-arena text-arena-t', Icono: AlertTriangle },
  vencido: { txt: 'Vencido', cls: 'bg-rosa text-riesgo', Icono: AlertTriangle },
  hoy: { txt: 'Vence hoy', cls: 'bg-rosa text-riesgo', Icono: AlertTriangle },
  proximo: { txt: 'Por vencer', cls: 'bg-arena text-arena-t', Icono: Clock },
  pendiente: { txt: 'Pendiente', cls: 'bg-gris text-suave', Icono: CircleDashed },
  informativo: { txt: 'Plazo de la DT', cls: 'bg-lav text-lav-t', Icono: Info }
};

export function EtiquetaEstado({ estado }: { estado: EstadoHito }) {
  const { txt, cls, Icono } = ESTILO[estado];
  return <span className={`pildora ${cls}`}><Icono className="size-3.5" aria-hidden />{txt}</span>;
}

export default function RelojPlazos({ hitos }: { hitos: Hito[] }) {
  return (
    <ol className="tarjeta p-5 md:p-6">
      {hitos.map((h, i) => (
        <li key={h.clave} className="relative grid gap-1 pb-6 pl-9 last:pb-0 md:grid-cols-[minmax(0,1fr)_220px] md:gap-6">
          {i < hitos.length - 1 && <span className="absolute bottom-0 left-[11px] top-7 w-px bg-menta-f" aria-hidden />}
          <span className="absolute left-0 top-0.5 grid size-6 place-items-center rounded-full bg-menta-f text-[0.72rem] font-semibold text-primario-f" aria-hidden>{i + 1}</span>
          <div>
            <p className="font-semibold leading-snug">{h.titulo}</p>
            <p className="ayuda">{h.base}</p>
            {h.nota && <p className="mt-1 text-[0.88rem] text-suave">{h.nota}</p>}
          </div>
          <div className="md:text-right">
            <EtiquetaEstado estado={h.estado} />
            <p className="mt-1 text-[0.9rem]">
              {h.cumplido ? <>Registrado el {fechaLarga(h.cumplido, false)}</>
                : h.vence ? <>{h.estimado ? 'A más tardar el ' : 'Vence el '}{fechaLarga(h.vence)}</>
                : <span className="text-suave">Sin plazo fijo</span>}
            </p>
            {h.cumplido && h.vence && <p className="ayuda">Plazo: {fechaLarga(h.vence, false)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
