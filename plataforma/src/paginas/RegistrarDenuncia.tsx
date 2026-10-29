import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase, mensajeError } from '../lib/supabase';
import { useEmpresas } from '../lib/empresa';
import { VIAS } from '../lib/tipos';
import FormularioDenuncia from '../componentes/FormularioDenuncia';
import Comprobante, { type DatosComprobante } from '../componentes/Comprobante';

export default function RegistrarDenuncia() {
  const { actual } = useEmpresas();
  const [hecho, setHecho] = useState<DatosComprobante | null>(null);
  if (!actual) return <main className="mx-auto max-w-[760px] px-4 py-10 text-suave">Cargando…</main>;
  return (
    <main className="mx-auto max-w-[760px] px-4 py-8">
      <Link to="/panel" className="enlace no-imprimir mb-4 inline-flex items-center gap-1 text-[0.9rem]"><ArrowLeft className="size-4" aria-hidden />Denuncias</Link>
      {hecho ? <Comprobante c={hecho} interno /> : (
        <>
          <h1 className="titulo text-[2rem]">Registrar una denuncia</h1>
          <p className="mb-6 mt-1 text-suave">Para las denuncias que {actual.nombre} recibió en forma verbal, por escrito o por correo. La fecha y hora de recepción serán las de este registro.</p>
          <FormularioDenuncia interno onEnviar={async (datos, via) => {
            const { data, error } = await supabase.rpc('registrar_denuncia', { p_empresa: actual.id, p_via: via, p_datos: datos });
            if (error) return mensajeError(error);
            setHecho({ ...(data as DatosComprobante), empresa: actual.nombre, via: VIAS[via] });
            scrollTo(0, 0);
            return null;
          }} />
        </>
      )}
    </main>
  );
}
