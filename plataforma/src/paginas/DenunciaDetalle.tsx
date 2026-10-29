import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Lock } from 'lucide-react';
import { supabase, mensajeError } from '../lib/supabase';
import type { Denuncia, Empresa, Identidad } from '../lib/tipos';
import { TIPOS, ESTADOS, VIAS } from '../lib/tipos';
import { calcularHitos, derivacionObligatoria } from '../lib/plazos';
import { hoyEnChile, horaChile, fechaLarga } from '../lib/fechas';
import { calendarioIcs, descargar } from '../lib/ics';
import RelojPlazos from '../componentes/RelojPlazos';

type Evento = { id: number; tipo: string; detalle: string | null; creado_en: string };
type Mensaje = { id: number; autor: string; texto: string; creado_en: string };

const CAMPOS_FECHA: [keyof Denuncia, string][] = [
  ['medidas_resguardo_en', 'Medidas de resguardo adoptadas el'],
  ['dt_informada_en', 'Dirección del Trabajo informada o denuncia derivada el'],
  ['decision_comunicada_en', 'Decisión comunicada por escrito a quien denuncia el'],
  ['investigacion_cerrada_en', 'Investigación concluida el'],
  ['informe_remitido_en', 'Informe remitido a la Dirección del Trabajo el'],
  ['pronunciamiento_notificado_en', 'Pronunciamiento de la Dirección del Trabajo notificado el'],
  ['medidas_aplicadas_en', 'Medidas o sanciones aplicadas e informadas el']
];

const NOMBRES: Record<string, string> = {
  estado: 'Estado', decision: 'Decisión', investigador: 'Persona a cargo de la investigación', contra_representante: 'Denuncia contra el empleador o su representante',
  ...Object.fromEntries(CAMPOS_FECHA.map(([k, v]) => [k, v.replace(/ el$/, '')]))
};
const VALORES: Record<string, string> = { ...ESTADOS, investigacion_interna: 'investigación interna', derivada_dt: 'derivar a la Dirección del Trabajo', true: 'sí', false: 'no', '—': 'sin dato' };

/** Traduce el detalle técnico de la bitácora («campo: valor · …») a texto legible. */
function detalleLegible(detalle: string | null): string {
  if (!detalle) return '';
  return detalle.split(' · ').map(par => {
    const [k, ...resto] = par.split(': ');
    if (!resto.length || !NOMBRES[k]) return par;
    const v = resto.join(': ');
    return `${NOMBRES[k]}: ${/^\d{4}-\d{2}-\d{2}$/.test(v) ? fechaLarga(v, false) : VALORES[v] ?? v}`;
  }).join(' · ');
}

export default function DenunciaDetalle() {
  const { id = '' } = useParams();
  const [d, setD] = useState<Denuncia | null>(null);
  const [form, setForm] = useState<Partial<Denuncia>>({});
  const [emp, setEmp] = useState<Empresa | null>(null);
  const [ident, setIdent] = useState<Identidad | null | undefined>(undefined);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('denuncias').select('*').eq('id', id).maybeSingle();
    if (!data) return setD(null);
    setD(data as Denuncia); setForm(data as Denuncia);
    const [e, i, ev, m] = await Promise.all([
      supabase.from('empresas').select('id, nombre, rut, correo_contacto, slug, inhabiles_extra').eq('id', data.empresa_id).single(),
      supabase.from('denuncia_identidad').select('*').eq('denuncia_id', id).maybeSingle(),
      supabase.from('eventos').select('id, tipo, detalle, creado_en').eq('denuncia_id', id).order('creado_en', { ascending: false }),
      supabase.from('mensajes').select('id, autor, texto, creado_en').eq('denuncia_id', id).order('creado_en')
    ]);
    setEmp(e.data as Empresa); setIdent((i.data as Identidad) ?? null); setEventos((ev.data as Evento[]) ?? []); setMensajes((m.data as Mensaje[]) ?? []);
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);

  const hitos = useMemo(() => d ? calcularHitos(d, hoyEnChile(), emp?.inhabiles_extra ?? []) : [], [d, emp]);

  if (d === null) return <main className="mx-auto max-w-[1100px] px-4 py-10"><p>No encontramos la denuncia o no tiene acceso a ella.</p><Link className="enlace" to="/panel">Volver</Link></main>;
  if (!d) return <main className="mx-auto max-w-[1100px] px-4 py-10 text-suave">Cargando…</main>;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null); setAviso(null);
    const cambios = Object.fromEntries(['estado', 'decision', 'medidas_resguardo', 'investigador', 'notas', ...CAMPOS_FECHA.map(c => c[0])]
      .map(k => [k, (form as Record<string, unknown>)[k] === '' ? null : (form as Record<string, unknown>)[k] ?? null]));
    const { error } = await supabase.from('denuncias').update(cambios).eq('id', id);
    if (error) return setError(mensajeError(error));
    setAviso('Cambios guardados.');
    cargar();
  }

  async function enviarMensaje(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('mensajes').insert({ denuncia_id: id, empresa_id: d!.empresa_id, autor: 'empresa', texto });
    if (error) return setError(mensajeError(error));
    setTexto(''); cargar();
  }

  const set = (k: keyof Denuncia, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <main className="mx-auto max-w-[1100px] space-y-6 px-4 py-8 md:px-8">
      <Link to="/panel" className="enlace no-imprimir inline-flex items-center gap-1 text-[0.9rem]"><ArrowLeft className="size-4" aria-hidden />Denuncias</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo text-[2rem]">Denuncia N.º {d.folio}</h1>
          <p className="text-suave">{horaChile(d.recibida_en)} · {VIAS[d.via]} · {d.tipos.map(t => TIPOS[t]).join(', ')}</p>
          <p className="ayuda">Código de seguimiento de quien denuncia: <span className="font-mono">{d.codigo}</span></p>
        </div>
        <button className="boton-s no-imprimir" onClick={() => descargar(`plazos-denuncia-${d.folio}.ics`, calendarioIcs(`Denuncia N.º ${d.folio}`, hitos, location.href), 'text/calendar;charset=utf-8')}>
          <CalendarPlus className="size-4" aria-hidden />Agregar plazos a mi calendario
        </button>
      </div>
      {derivacionObligatoria(d) && <p className="rounded-xl bg-arena px-4 py-3 text-[0.92rem] text-arena-t">Esta denuncia debe derivarse a la Dirección del Trabajo (DS 21/2024, art. 12): {d.contra_representante ? 'se dirige contra el empleador o quien lo representa.' : 'la persona denunciante lo pidió.'}</p>}

      <section>
        <h2 className="titulo mb-3 text-[1.3rem]">Reloj de plazos</h2>
        <RelojPlazos hitos={hitos} />
        <p className="ayuda mt-2">Días hábiles sin sábados, domingos ni festivos (DS 21/2024, art. 1). Se consideran los feriados nacionales y los días que su empresa agregó. Revise siempre cada caso en particular.</p>
      </section>

      <form onSubmit={guardar} className="tarjeta space-y-5 p-6 no-imprimir">
        <h2 className="titulo text-[1.3rem]">Registrar avances</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block"><span className="etiqueta">Decisión de la empresa</span>
            <select className="campo" value={form.decision ?? ''} onChange={e => set('decision', e.target.value)}>
              <option value="">Aún no decide</option>
              <option value="investigacion_interna" disabled={derivacionObligatoria(d)}>Investigación interna</option>
              <option value="derivada_dt">Derivar a la Dirección del Trabajo</option>
            </select>
          </label>
          <label className="block"><span className="etiqueta">Estado</span>
            <select className="campo" value={form.estado ?? 'recibida'} onChange={e => set('estado', e.target.value)}>
              {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <span className="ayuda">Es lo que ve quien denuncia en el seguimiento.</span>
          </label>
          {CAMPOS_FECHA.map(([k, etq]) => (
            <label key={k} className="block"><span className="etiqueta">{etq}</span>
              <input className="campo" type="date" value={(form[k] as string) ?? ''} onChange={e => set(k, e.target.value)} />
            </label>
          ))}
          <label className="block md:col-span-2"><span className="etiqueta">Medidas de resguardo adoptadas</span>
            <textarea className="campo" rows={2} value={form.medidas_resguardo ?? ''} onChange={e => set('medidas_resguardo', e.target.value)} placeholder="Ej.: separación de espacios, redistribución de jornada, derivación a atención psicológica temprana" />
          </label>
          <label className="block md:col-span-2"><span className="etiqueta">Persona a cargo de la investigación</span>
            <input className="campo" value={form.investigador ?? ''} onChange={e => set('investigador', e.target.value)} />
            <span className="ayuda">Su designación debe informarse por escrito a quien denuncia (DS 21/2024, art. 14).</span>
          </label>
          <label className="block md:col-span-2"><span className="etiqueta">Notas internas</span>
            <textarea className="campo" rows={3} value={form.notas ?? ''} onChange={e => set('notas', e.target.value)} />
          </label>
        </div>
        {error && <p role="alert" className="rounded-xl bg-rosa px-4 py-3 text-[0.9rem] text-riesgo">{error}</p>}
        {aviso && <p role="status" className="rounded-xl bg-menta px-4 py-3 text-[0.9rem] text-primario-f">{aviso}</p>}
        <button className="boton">Guardar avances</button>
      </form>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="tarjeta p-6">
          <h2 className="titulo mb-3 flex items-center gap-2 text-[1.2rem]"><Lock className="size-4 text-primario" aria-hidden />Identidad (reservada)</h2>
          {ident === undefined ? <p className="text-suave">Cargando…</p> : ident === null ? <p className="text-suave">Su cuenta no tiene acceso a la identidad de las personas.</p> : (
            <dl className="grid gap-2 text-[0.93rem]">
              <div><dt className="ayuda">Persona afectada</dt><dd className="font-semibold">{ident.afectado_nombre} · {ident.afectado_rut}</dd><dd>{ident.afectado_correo}{ident.afectado_telefono ? ` · ${ident.afectado_telefono}` : ''}</dd>{ident.afectado_cargo && <dd className="ayuda">{ident.afectado_cargo}</dd>}</div>
              {ident.denunciante_distinto && <div><dt className="ayuda">Denuncia presentada por</dt><dd className="font-semibold">{ident.denunciante_nombre}{ident.denunciante_rut ? ` · ${ident.denunciante_rut}` : ''}</dd><dd>{ident.denunciante_correo} · {ident.representacion}</dd></div>}
            </dl>
          )}
        </section>
        <section className="tarjeta p-6">
          <h2 className="titulo mb-3 text-[1.2rem]">Personas denunciadas</h2>
          {d.denunciados.length === 0 ? <p className="text-suave">No se indicaron.</p> : (
            <ul className="space-y-1 text-[0.93rem]">{d.denunciados.map((p, i) => <li key={i}><b>{p.nombre || 'Sin nombre'}</b>{p.cargo ? ` · ${p.cargo}` : ''}</li>)}</ul>
          )}
          {d.vinculo && <p className="mt-3 text-[0.9rem]"><span className="ayuda block">Vínculo</span>{d.vinculo}</p>}
        </section>
      </div>

      <section className="tarjeta p-6">
        <h2 className="titulo mb-3 text-[1.2rem]">Relato de los hechos</h2>
        <p className="whitespace-pre-wrap text-[0.95rem]">{d.hechos}</p>
        {d.testigos && <><h3 className="mt-4 font-semibold">Testigos y antecedentes</h3><p className="whitespace-pre-wrap text-[0.95rem]">{d.testigos}</p></>}
      </section>

      <section className="tarjeta p-6 no-imprimir">
        <h2 className="titulo mb-3 text-[1.2rem]">Mensajes con quien denuncia</h2>
        <ol className="space-y-3">
          {mensajes.length === 0 && <li className="text-suave">Aún no hay mensajes.</li>}
          {mensajes.map(m => (
            <li key={m.id} className={`rounded-2xl px-4 py-3 ${m.autor === 'empresa' ? 'bg-menta' : 'border border-borde bg-white'}`}>
              <p className="ayuda mb-1">{m.autor === 'empresa' ? 'Empresa' : 'Persona denunciante'} · {horaChile(m.creado_en)}</p>
              <p className="whitespace-pre-wrap text-[0.95rem]">{m.texto}</p>
            </li>
          ))}
        </ol>
        <form onSubmit={enviarMensaje} className="mt-4 space-y-2">
          <textarea className="campo" rows={3} maxLength={4000} value={texto} onChange={e => setTexto(e.target.value)} placeholder="La persona lo verá al consultar el seguimiento con su código y clave." aria-label="Mensaje" />
          <button className="boton" disabled={!texto.trim()}>Enviar mensaje</button>
        </form>
      </section>

      <section className="tarjeta p-6">
        <h2 className="titulo mb-3 text-[1.2rem]">Bitácora</h2>
        <ol className="space-y-2 text-[0.9rem]">
          {eventos.map(ev => <li key={ev.id}><span className="ayuda">{horaChile(ev.creado_en)}</span> · {detalleLegible(ev.detalle) || ev.tipo}</li>)}
        </ol>
      </section>
    </main>
  );
}
