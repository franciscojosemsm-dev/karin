import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer } from 'lucide-react';
import { useEmpresas, urlCanal } from '../lib/empresa';

/* Afiche imprimible con el código QR del canal, para murales y lugares de trabajo. */
export default function Afiche() {
  const { actual } = useEmpresas();
  const [qr, setQr] = useState('');
  useEffect(() => { if (actual) QRCode.toDataURL(urlCanal(actual.slug), { margin: 1, width: 900 }).then(setQr); }, [actual]);
  if (!actual) return <main className="p-10 text-suave">Cargando…</main>;
  return (
    <main className="mx-auto max-w-[720px] px-4 py-8 text-center">
      <button className="boton no-imprimir mb-6" onClick={() => print()}><Printer className="size-4" aria-hidden />Imprimir</button>
      <div className="tarjeta p-10">
        <p className="text-[0.9rem] font-semibold uppercase tracking-[0.08em] text-primario">Ley 21.643 · Ley Karin</p>
        <h1 className="titulo mt-3 text-[2.4rem] leading-tight">Canal de denuncias de acoso y violencia en el trabajo</h1>
        <p className="mt-3 text-[1.1rem]">{actual.nombre}</p>
        {qr && <img src={qr} alt="Código QR del canal de denuncias" className="mx-auto my-8 size-72" />}
        <p className="break-all font-mono text-[0.95rem]">{urlCanal(actual.slug)}</p>
        <p className="mx-auto mt-6 max-w-[48ch] text-[0.95rem] text-suave">
          Escanee el código para presentar una denuncia de acoso laboral, acoso sexual o violencia en el trabajo. Su identidad es reservada.
          También puede denunciar ante la Dirección del Trabajo (www.dt.gob.cl).
        </p>
      </div>
    </main>
  );
}
