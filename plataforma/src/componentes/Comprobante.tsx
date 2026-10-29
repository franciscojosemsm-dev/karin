import { Printer, Download, CheckCircle2 } from 'lucide-react';
import { horaChile } from '../lib/fechas';
import { descargar } from '../lib/ics';

export type DatosComprobante = { empresa: string; folio: number; recibida_en: string; codigo: string; clave: string; via?: string };

/* Comprobante de la gestión (DS 21/2024, art. 11) y credenciales de seguimiento. La clave solo se muestra esta vez. */
export default function Comprobante({ c, interno = false }: { c: DatosComprobante; interno?: boolean }) {
  const texto = `COMPROBANTE DE DENUNCIA · LEY 21.643
Empresa: ${c.empresa}
Folio: ${c.folio}
Recibida: ${horaChile(c.recibida_en)} (hora de Chile)
${c.via ? `Vía: ${c.via}\n` : ''}
Para seguir su denuncia en ${location.origin}/seguimiento
Código: ${c.codigo}
Clave: ${c.clave}

Guarde este comprobante. La clave no se puede recuperar.`;
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-1 size-7 shrink-0 text-primario" aria-hidden />
        <div>
          <h2 className="titulo text-[1.6rem]">{interno ? 'Denuncia registrada' : 'Su denuncia fue recibida'}</h2>
          <p className="text-suave">{interno ? 'Entregue este comprobante a la persona denunciante, impreso o por correo.' : 'Este es su comprobante. Guárdelo o imprímalo ahora.'}</p>
        </div>
      </div>
      <dl className="tarjeta grid gap-4 p-6 sm:grid-cols-2">
        <div><dt className="ayuda">Empresa</dt><dd className="font-semibold">{c.empresa}</dd></div>
        <div><dt className="ayuda">Folio</dt><dd className="font-semibold">N.º {c.folio}</dd></div>
        <div className="sm:col-span-2"><dt className="ayuda">Fecha y hora de recepción</dt><dd className="font-semibold">{horaChile(c.recibida_en)} (hora de Chile)</dd></div>
        <div><dt className="ayuda">Código de seguimiento</dt><dd className="font-mono text-[1.2rem] font-bold tracking-wider">{c.codigo}</dd></div>
        <div><dt className="ayuda">Clave</dt><dd className="font-mono text-[1.2rem] font-bold tracking-wider">{c.clave}</dd></div>
      </dl>
      <p className="rounded-xl bg-arena px-4 py-3 text-[0.92rem] text-arena-t">
        Con el código y la clave {interno ? 'la persona denunciante puede' : 'puede'} consultar el estado de la denuncia y enviar mensajes en <b>{location.host}/seguimiento</b>. La clave se muestra solo esta vez y no se puede recuperar.
      </p>
      <div className="no-imprimir flex flex-wrap gap-2">
        <button className="boton" onClick={() => print()}><Printer className="size-4" aria-hidden />Imprimir</button>
        <button className="boton-s" onClick={() => descargar(`comprobante-denuncia-${c.folio}.txt`, texto, 'text/plain;charset=utf-8')}><Download className="size-4" aria-hidden />Descargar</button>
      </div>
    </div>
  );
}
