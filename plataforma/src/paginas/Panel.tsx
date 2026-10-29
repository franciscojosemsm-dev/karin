import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { Copy, Download, Printer, Plus, CalendarX2, Trash2 } from 'lucide-react';
import { supabase, mensajeError } from '../lib/supabase';
import { useEmpresas, urlCanal } from '../lib/empresa';
import type { Denuncia, Empresa } from '../lib/tipos';
import { TIPOS, ESTADOS } from '../lib/tipos';
import { calcularHitos, proximoHito } from '../lib/plazos';
import { hoyEnChile, fechaLarga, horaChile } from '../lib/fechas';
import { EtiquetaEstado } from '../componentes/RelojPlazos';

function NuevaEmpresa({ alCrear }: { alCrear: (id: string) => void }) {
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState<string | null>(null);
  async function crear(e: FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.rpc('crear_empresa', { p_nombre: nombre, p_rut: rut, p_correo: correo });
    if (error) return setError(mensajeError(error));
    alCrear((data as Empresa).id);
  }
  return (
    <form onSubmit={crear} className="tarjeta mx-auto max-w-[520px] space-y-4 p-7">
      <h1 className="titulo text-[1.6rem]">Registre su empresa</h1>
      <p className="ayuda">Con estos datos se crea el canal de denuncias de la empresa. Usted quedará como administrador.</p>
      <label className="block"><span className="etiqueta">Razón social o nombre</span><input className="campo" required minLength={2} value={nombre} onChange={e => setNombre(e.target.value)} /></label>
      <label className="block"><span className="etiqueta">RUT de la empresa (opcional)</span><input className="campo" value={rut} onChange={e => setRut(e.target.value)} placeholder="76.543.210-3" /></label>
      <label className="block"><span className="etiqueta">Correo para recibir avisos (opcional)</span><input className="campo" type="email" value={correo} onChange={e => setCorreo(e.target.value)} /></label>
      {error && <p role="alert" className="rounded-xl bg-rosa px-4 py-3 text-[0.9rem] text-riesgo">{error}</p>}
      <button className="boton w-full">Crear canal de denuncias</button>
    </form>
  );
}

function Canal({ e }: { e: Empresa }) {
  const url = urlCanal(e.slug);
  const [qr, setQr] = useState('');
  const [copiado, setCopiado] = useState(false);
  useEffect(() => { QRCode.toDataURL(url, { margin: 1, width: 480, color: { dark: '#1c2725' } }).then(setQr); }, [url]);
  return (
    <section className="tarjeta grid gap-5 p-6 md:grid-cols-[1fr_160px] md:items-center">
      <div>
        <h2 className="titulo text-[1.3rem]">Canal de denuncias de {e.nombre}</h2>
        <p className="ayuda mb-3">Publíquelo para sus trabajadores: el reglamento exige disponer e informar medios idóneos para recibir denuncias (DS 21/2024, art. 11).</p>
        <p className="break-all rounded-xl bg-gris px-3 py-2 font-mono text-[0.88rem]">{url}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="boton-s" onClick={async () => { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}><Copy className="size-4" aria-hidden />{copiado ? 'Copiado' : 'Copiar enlace'}</button>
          {qr && <a className="boton-s" href={qr} download={`qr-canal-${e.slug}.png`}><Download className="size-4" aria-hidden />Descargar QR</a>}
          <Link className="boton-s" to="/panel/afiche"><Printer className="size-4" aria-hidden />Afiche para imprimir</Link>
        </div>
      </div>
      {qr && <img src={qr} alt={`Código QR del canal de denuncias de ${e.nombre}`} className="mx-auto size-40 rounded-xl border border-borde" />}
    </section>
  );
}

function Inhabiles({ e, alCambiar }: { e: Empresa; alCambiar: () => void }) {
  const [f, setF] = useState('');
  const [error, setError] = useState<string | null>(null);
  async function guardar(lista: string[]) {
    const { error } = await supabase.from('empresas').update({ inhabiles_extra: [...new Set(lista)].sort() }).eq('id', e.id);
    if (error) return setError(mensajeError(error));
    setF(''); alCambiar();
  }
  return (
    <section className="tarjeta p-6">
      <h2 className="titulo flex items-center gap-2 text-[1.2rem]"><CalendarX2 className="size-5 text-primario" aria-hidden />Días inhábiles adicionales</h2>
      <p className="ayuda mb-3">Los feriados nacionales ya están considerados. Agregue los regionales que rijan en su empresa o los feriados por elecciones.</p>
      <ul className="mb-3 flex flex-wrap gap-2">
        {e.inhabiles_extra.length === 0 && <li className="ayuda">Ninguno.</li>}
        {e.inhabiles_extra.map(d => (
          <li key={d} className="pildora bg-gris text-texto">{fechaLarga(d)}
            <button aria-label={`Quitar ${d}`} onClick={() => guardar(e.inhabiles_extra.filter(x => x !== d))}><Trash2 className="size-3.5 text-suave" /></button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <input className="campo max-w-[200px]" type="date" value={f} onChange={ev => setF(ev.target.value)} aria-label="Fecha" />
        <button className="boton-s" disabled={!f} onClick={() => guardar([...e.inhabiles_extra, f])}>Agregar</button>
      </div>
      {error && <p role="alert" className="mt-2 text-[0.9rem] text-riesgo">{error}</p>}
    </section>
  );
}

export default function Panel() {
  const { empresas, actual, elegir, recargar } = useEmpresas();
  const [denuncias, setDenuncias] = useState<Denuncia[] | null>(null);
  useEffect(() => {
    if (!actual) return;
    supabase.from('denuncias').select('*').eq('empresa_id', actual.id).order('recibida_en', { ascending: false })
      .then(({ data }) => setDenuncias((data as Denuncia[]) ?? []));
  }, [actual]);

  const hoy = hoyEnChile();
  const filas = useMemo(() => (denuncias ?? []).map(d => {
    const hitos = calcularHitos(d, hoy, actual?.inhabiles_extra ?? []);
    return { d, prox: proximoHito(hitos), alertas: hitos.filter(h => h.estado === 'vencido' || h.estado === 'hoy').length };
  }).sort((a, b) => (b.alertas - a.alertas) || (a.prox?.vence ?? '9').localeCompare(b.prox?.vence ?? '9')), [denuncias, actual, hoy]);

  if (empresas === null) return <main className="mx-auto max-w-[1100px] px-4 py-10 text-suave">Cargando…</main>;
  if (!actual) return <main className="px-4 py-12"><NuevaEmpresa alCrear={id => { elegir(id); recargar(); }} /></main>;

  return (
    <main className="mx-auto max-w-[1100px] space-y-6 px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo text-[2rem]">Denuncias</h1>
          {empresas.length > 1 ? (
            <select className="campo mt-1 max-w-[320px]" value={actual.id} onChange={e => elegir(e.target.value)} aria-label="Empresa">
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          ) : <p className="text-suave">{actual.nombre}</p>}
        </div>
        <Link className="boton" to="/panel/registrar"><Plus className="size-4" aria-hidden />Registrar denuncia recibida por otra vía</Link>
      </div>

      <section className="tarjeta overflow-hidden">
        {denuncias === null ? <p className="p-6 text-suave">Cargando…</p> : filas.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-semibold">Aún no hay denuncias.</p>
            <p className="ayuda">Las que lleguen por el canal aparecerán aquí con su reloj de plazos.</p>
          </div>
        ) : (
          <ul className="divide-y divide-borde">
            {filas.map(({ d, prox }) => (
              <li key={d.id}>
                <Link to={`/panel/denuncia/${d.id}`} className="grid gap-2 px-5 py-4 transition-colors hover:bg-gris md:grid-cols-[90px_1fr_minmax(0,320px)] md:items-center">
                  <span className="font-semibold">N.º {d.folio}</span>
                  <span>
                    <span className="block text-[0.95rem] font-medium">{d.tipos.map(t => TIPOS[t]).join(' · ')}</span>
                    <span className="ayuda">{horaChile(d.recibida_en)} · {ESTADOS[d.estado]}</span>
                  </span>
                  <span className="md:text-right">
                    {prox ? <><EtiquetaEstado estado={prox.estado} /><span className="mt-0.5 block text-[0.86rem]">{prox.titulo.length > 60 ? prox.titulo.slice(0, 58) + '…' : prox.titulo}: {fechaLarga(prox.vence, false)}</span></>
                      : <span className="ayuda">Sin plazos pendientes</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Canal e={actual} />
      <Inhabiles e={actual} alCambiar={recargar} />
    </main>
  );
}
