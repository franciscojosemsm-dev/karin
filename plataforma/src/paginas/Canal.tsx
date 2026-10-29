import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { supabase, mensajeError } from '../lib/supabase';
import FormularioDenuncia from '../componentes/FormularioDenuncia';
import Comprobante, { type DatosComprobante } from '../componentes/Comprobante';

/* Canal público de denuncias de una empresa: /d/:slug. No requiere cuenta. */
export default function Canal() {
  const { slug = '' } = useParams();
  const [empresa, setEmpresa] = useState<string | null | undefined>(undefined);
  const [hecho, setHecho] = useState<DatosComprobante | null>(null);

  useEffect(() => {
    supabase.rpc('empresa_publica', { p_slug: slug }).then(({ data, error }) => setEmpresa(error || !data ? null : data.nombre));
  }, [slug]);

  if (empresa === undefined) return <main className="mx-auto max-w-[760px] px-4 py-16 text-suave">Cargando…</main>;
  if (empresa === null) return (
    <main className="mx-auto max-w-[760px] px-4 py-16">
      <h1 className="titulo text-[1.8rem]">Canal no encontrado</h1>
      <p className="mt-2 text-suave">Revise el enlace o el código QR que le entregó su empresa.</p>
    </main>
  );

  return (
    <main className="mx-auto max-w-[760px] px-4 py-10 md:py-14">
      {hecho ? <Comprobante c={hecho} /> : (
        <>
          <p className="pildora mb-3 border border-borde bg-white text-suave"><ShieldCheck className="size-3.5 text-primario" aria-hidden />Canal de denuncias · Ley 21.643</p>
          <h1 className="titulo text-[2rem] leading-tight md:text-[2.4rem]">{empresa}</h1>
          <p className="mb-8 mt-2 max-w-[60ch] text-suave">
            Use este formulario para denunciar acoso laboral, acoso sexual o violencia en el trabajo. También puede denunciar directamente ante la{' '}
            <a className="enlace" href="https://www.dt.gob.cl" target="_blank" rel="noreferrer">Dirección del Trabajo</a>.
          </p>
          <FormularioDenuncia onEnviar={async datos => {
            const { data, error } = await supabase.rpc('crear_denuncia', { p_slug: slug, p_datos: datos });
            if (error) return mensajeError(error);
            setHecho(data as DatosComprobante);
            scrollTo(0, 0);
            return null;
          }} />
        </>
      )}
    </main>
  );
}
