import { useState, type FormEvent } from 'react';
import { supabase, mensajeError } from '../lib/supabase';
import { ESTADOS } from '../lib/tipos';
import { horaChile, fechaLarga } from '../lib/fechas';

type Consulta = {
  empresa: string; folio: number; recibida_en: string; estado: string; decision: string | null; decision_comunicada_en: string | null;
  mensajes: { autor: string; texto: string; creado_en: string }[];
};

export default function Seguimiento() {
  const [codigo, setCodigo] = useState('');
  const [clave, setClave] = useState('');
  const [datos, setDatos] = useState<Consulta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function consultar(e?: FormEvent) {
    e?.preventDefault();
    setOcupado(true); setError(null);
    const { data, error } = await supabase.rpc('consultar_denuncia', { p_codigo: codigo, p_clave: clave });
    setOcupado(false);
    if (error) return setError(mensajeError(error));
    if (!data) { setDatos(null); return setError('El código o la clave no coinciden con ninguna denuncia.'); }
    setDatos(data as Consulta);
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setOcupado(true);
    const { data, error } = await supabase.rpc('mensaje_denunciante', { p_codigo: codigo, p_clave: clave, p_texto: texto });
    setOcupado(false);
    if (error || !data) return setError(error ? mensajeError(error) : 'No se pudo enviar el mensaje.');
    setTexto('');
    consultar();
  }

  return (
    <main className="mx-auto max-w-[760px] px-4 py-10 md:py-14">
      <h1 className="titulo text-[2rem]">Seguimiento de su denuncia</h1>
      <p className="mb-6 mt-2 text-suave">Ingrese el código y la clave de su comprobante.</p>
      <form onSubmit={consultar} className="tarjeta grid gap-4 p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label><span className="etiqueta">Código</span><input className="campo font-mono uppercase" value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="K-XXXXXXXX" autoComplete="off" required /></label>
        <label><span className="etiqueta">Clave</span><input className="campo font-mono uppercase" value={clave} onChange={e => setClave(e.target.value)} placeholder="XXXXX-XXXXX-XXXXX" autoComplete="off" required /></label>
        <button className="boton" disabled={ocupado}>Consultar</button>
      </form>
      {error && <p role="alert" className="mt-4 rounded-xl bg-rosa px-4 py-3 text-[0.92rem] text-riesgo">{error}</p>}
      {datos && (
        <section className="mt-8 space-y-6">
          <div className="tarjeta grid gap-4 p-6 sm:grid-cols-2">
            <div><p className="ayuda">Empresa</p><p className="font-semibold">{datos.empresa}</p></div>
            <div><p className="ayuda">Folio</p><p className="font-semibold">N.º {datos.folio}</p></div>
            <div><p className="ayuda">Recibida</p><p className="font-semibold">{horaChile(datos.recibida_en)}</p></div>
            <div><p className="ayuda">Estado</p><p className="font-semibold text-primario">{ESTADOS[datos.estado] ?? datos.estado}</p></div>
            {datos.decision_comunicada_en && <div className="sm:col-span-2"><p className="ayuda">La empresa le comunicó su decisión el</p><p className="font-semibold">{fechaLarga(datos.decision_comunicada_en)}</p></div>}
          </div>
          <div>
            <h2 className="titulo mb-3 text-[1.3rem]">Mensajes</h2>
            <ol className="space-y-3">
              {datos.mensajes.length === 0 && <li className="text-suave">Aún no hay mensajes.</li>}
              {datos.mensajes.map((m, i) => (
                <li key={i} className={`rounded-2xl px-4 py-3 ${m.autor === 'empresa' ? 'bg-menta' : 'border border-borde bg-white'}`}>
                  <p className="ayuda mb-1">{m.autor === 'empresa' ? 'Empresa' : 'Usted'} · {horaChile(m.creado_en)}</p>
                  <p className="whitespace-pre-wrap text-[0.95rem]">{m.texto}</p>
                </li>
              ))}
            </ol>
            <form onSubmit={enviar} className="mt-4 space-y-3">
              <label className="block"><span className="etiqueta">Escribir a la empresa</span><textarea className="campo" rows={3} maxLength={4000} value={texto} onChange={e => setTexto(e.target.value)} placeholder="Puede agregar antecedentes o hacer consultas sobre el procedimiento." /></label>
              <button className="boton" disabled={ocupado || !texto.trim()}>Enviar mensaje</button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
