import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Plus, KeyRound, Copy, Briefcase } from 'lucide-react';
import { useBoveda } from '../lib/boveda';
import { nuevoCodigoRecuperacion } from '../lib/cripto';
import { listar, crear, type Abierto } from '../lib/expedientes';
import { nuevoExpediente, comoDenuncia, avanceControl } from '../lib/expediente';
import { calcularHitos, proximoHito } from '../lib/plazos';
import { hoyEnChile, fechaLarga } from '../lib/fechas';
import { mensajeError } from '../lib/supabase';
import { EtiquetaEstado } from '../componentes/RelojPlazos';

function CrearBoveda() {
  const { crear: crearB } = useBoveda();
  const [marca, setMarca] = useState('');
  const [clave, setClave] = useState('');
  const [clave2, setClave2] = useState('');
  const [codigo] = useState(nuevoCodigoRecuperacion);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (clave.length < 12) return setError('La clave de expedientes debe tener al menos 12 caracteres.');
    if (clave !== clave2) return setError('Las claves no coinciden.');
    if (!guardado) return setError('Confirme que guardó el código de recuperación.');
    setOcupado(true);
    try { await crearB(marca.trim(), clave, codigo); } catch (er) { setError(mensajeError(er)); setOcupado(false); }
  }
  return (
    <form onSubmit={enviar} className="tarjeta mx-auto max-w-[560px] space-y-4 p-7">
      <h1 className="titulo text-[1.7rem]">Mesa del investigador</h1>
      <p className="text-suave">Sus expedientes se cifran en este navegador con una clave que solo usted conoce. Ni Ruiz &amp; Morales ni el proveedor de la base de datos pueden leerlos.</p>
      <label className="block"><span className="etiqueta">Nombre que aparecerá en actas e informes</span><input className="campo" required minLength={2} value={marca} onChange={e => setMarca(e.target.value)} placeholder="Ej.: Consultora Pérez y Asociados" /></label>
      <label className="block"><span className="etiqueta">Clave de expedientes</span><input className="campo" type="password" autoComplete="new-password" value={clave} onChange={e => setClave(e.target.value)} /><span className="ayuda">Al menos 12 caracteres. Es distinta de la contraseña de su cuenta.</span></label>
      <label className="block"><span className="etiqueta">Repita la clave</span><input className="campo" type="password" autoComplete="new-password" value={clave2} onChange={e => setClave2(e.target.value)} /></label>
      <div className="rounded-xl bg-arena p-4 text-arena-t">
        <p className="font-semibold">Código de recuperación</p>
        <p className="my-2 select-all break-all font-mono text-[1.1rem] font-bold tracking-wider">{codigo}</p>
        <p className="text-[0.9rem]">Si olvida la clave, solo este código permite recuperar los expedientes. Guárdelo fuera del computador (impreso o en un gestor de contraseñas). No se puede volver a mostrar.</p>
        <button type="button" className="boton-s mt-2" onClick={() => navigator.clipboard.writeText(codigo)}><Copy className="size-4" aria-hidden />Copiar</button>
      </div>
      <label className="flex items-start gap-2 text-[0.92rem]"><input type="checkbox" className="mt-1 accent-[#047857]" checked={guardado} onChange={e => setGuardado(e.target.checked)} />Guardé el código de recuperación en un lugar seguro.</label>
      {error && <p role="alert" className="rounded-xl bg-rosa px-4 py-3 text-[0.9rem] text-riesgo">{error}</p>}
      <button className="boton w-full" disabled={ocupado}>{ocupado ? 'Creando…' : 'Crear mi mesa'}</button>
    </form>
  );
}

function AbrirBoveda() {
  const { abrir, recuperar, marca } = useBoveda();
  const [modo, setModo] = useState<'clave' | 'recuperar'>('clave');
  const [clave, setClave] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nueva, setNueva] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  async function enviar(e: FormEvent) {
    e.preventDefault(); setError(null);
    if (modo === 'recuperar' && nueva.length < 12) return setError('La clave nueva debe tener al menos 12 caracteres.');
    setOcupado(true);
    const ok = modo === 'clave' ? await abrir(clave) : await recuperar(codigo, nueva);
    setOcupado(false);
    if (!ok) setError(modo === 'clave' ? 'La clave no es correcta.' : 'El código de recuperación no es correcto.');
  }
  return (
    <form onSubmit={enviar} className="tarjeta mx-auto max-w-[460px] space-y-4 p-7">
      <h1 className="titulo flex items-center gap-2 text-[1.6rem]"><Lock className="size-5 text-primario" aria-hidden />Abrir expedientes</h1>
      <p className="ayuda">{marca}</p>
      {modo === 'clave' ? (
        <label className="block"><span className="etiqueta">Clave de expedientes</span><input className="campo" type="password" autoComplete="current-password" autoFocus value={clave} onChange={e => setClave(e.target.value)} /></label>
      ) : (
        <>
          <label className="block"><span className="etiqueta">Código de recuperación</span><input className="campo font-mono uppercase" value={codigo} onChange={e => setCodigo(e.target.value)} /></label>
          <label className="block"><span className="etiqueta">Clave nueva</span><input className="campo" type="password" autoComplete="new-password" value={nueva} onChange={e => setNueva(e.target.value)} /></label>
        </>
      )}
      {error && <p role="alert" className="rounded-xl bg-rosa px-4 py-3 text-[0.9rem] text-riesgo">{error}</p>}
      <button className="boton w-full" disabled={ocupado}>{ocupado ? 'Abriendo…' : modo === 'clave' ? 'Abrir' : 'Recuperar y fijar clave nueva'}</button>
      <button type="button" className="enlace text-[0.88rem]" onClick={() => { setModo(modo === 'clave' ? 'recuperar' : 'clave'); setError(null); }}>
        {modo === 'clave' ? 'Olvidé la clave: usar el código de recuperación' : 'Volver a la clave'}
      </button>
    </form>
  );
}

function Lista() {
  const { dek, marca, cerrar } = useBoveda();
  const navegar = useNavigate();
  const [items, setItems] = useState<Abierto[] | null>(null);
  const [ilegibles, setIlegibles] = useState(0);
  const [ref, setRef] = useState('');
  const [recibida, setRecibida] = useState(hoyEnChile());
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { listar(dek!).then(r => { setItems(r.abiertos); setIlegibles(r.ilegibles); }).catch(e => setError(mensajeError(e))); }, [dek]);
  async function nuevo(e: FormEvent) {
    e.preventDefault();
    try { const id = await crear(dek!, nuevoExpediente(ref.trim(), recibida)); navegar(`/mesa/expediente/${id}`); }
    catch (er) { setError(mensajeError(er)); }
  }
  const hoy = hoyEnChile();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="titulo text-[2rem]">Expedientes</h1><p className="text-suave">{marca}</p></div>
        <button className="boton-s" onClick={cerrar}><Lock className="size-4" aria-hidden />Cerrar expedientes</button>
      </div>
      <form onSubmit={nuevo} className="tarjeta grid gap-3 p-5 md:grid-cols-[1fr_200px_auto] md:items-end">
        <label><span className="etiqueta">Referencia del caso</span><input className="campo" required value={ref} onChange={e => setRef(e.target.value)} placeholder="Ej.: Cliente X · denuncia N.º 3" /></label>
        <label><span className="etiqueta">Fecha de la denuncia</span><input className="campo" type="date" required value={recibida} onChange={e => setRecibida(e.target.value)} /></label>
        <button className="boton"><Plus className="size-4" aria-hidden />Nuevo expediente</button>
      </form>
      {error && <p role="alert" className="rounded-xl bg-rosa px-4 py-3 text-[0.9rem] text-riesgo">{error}</p>}
      {ilegibles > 0 && <p className="rounded-xl bg-arena px-4 py-3 text-[0.9rem] text-arena-t">{ilegibles} expediente(s) no se pudieron abrir con esta clave.</p>}
      <section className="tarjeta overflow-hidden">
        {items === null ? <p className="p-6 text-suave">Abriendo expedientes…</p> : items.length === 0 ? (
          <div className="p-8 text-center"><Briefcase className="mx-auto size-6 text-primario" aria-hidden /><p className="mt-2 font-semibold">Aún no tiene expedientes.</p><p className="ayuda">Cree el primero con la referencia del caso y la fecha de la denuncia.</p></div>
        ) : (
          <ul className="divide-y divide-borde">
            {items.map(({ id, e }) => {
              const prox = proximoHito(calcularHitos(comoDenuncia(e), hoy, e.inhabiles_extra));
              const { hechos, total } = avanceControl(e);
              return (
                <li key={id}>
                  <Link to={`/mesa/expediente/${id}`} className="grid gap-2 px-5 py-4 transition-colors hover:bg-gris md:grid-cols-[1fr_minmax(0,320px)] md:items-center">
                    <span><span className="block font-semibold">{e.referencia}</span><span className="ayuda">{e.cliente.nombre || 'Sin cliente'} · denuncia del {fechaLarga(e.denuncia.recibida, false)} · lista de control {hechos}/{total}</span></span>
                    <span className="md:text-right">{prox ? <><EtiquetaEstado estado={prox.estado} /><span className="mt-0.5 block text-[0.86rem]">{prox.titulo.length > 55 ? prox.titulo.slice(0, 53) + '…' : prox.titulo}: {fechaLarga(prox.vence, false)}</span></> : <span className="ayuda">Sin plazos pendientes</span>}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function Mesa() {
  const { estado } = useBoveda();
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 md:px-8">
      {estado === 'cargando' ? <p className="text-suave">Cargando…</p> : estado === 'sin' ? <CrearBoveda /> : estado === 'cerrada' ? <AbrirBoveda /> : <Lista />}
      {estado !== 'abierta' && estado !== 'cargando' && <p className="ayuda mx-auto mt-4 max-w-[560px] text-center"><KeyRound className="mr-1 inline size-3.5" aria-hidden />Los expedientes se cierran solos tras 30 minutos sin uso.</p>}
    </main>
  );
}
