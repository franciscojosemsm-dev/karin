import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, FileText, Printer, CalendarPlus } from 'lucide-react';
import { useBoveda } from '../lib/boveda';
import { cargar, guardar, borrar, type Abierto } from '../lib/expedientes';
import { type Expediente as Exp, type Parte, type Entrevista, CALIDADES, LISTA_CONTROL, comoDenuncia, avanceControl, id as nuevoId } from '../lib/expediente';
import { calcularHitos } from '../lib/plazos';
import { hoyEnChile, fechaLarga } from '../lib/fechas';
import { TIPOS } from '../lib/tipos';
import { calendarioIcs, descargar } from '../lib/ics';
import { mensajeError } from '../lib/supabase';
import RelojPlazos from '../componentes/RelojPlazos';

const PESTANAS = ['Resumen y plazos', 'Partes', 'Entrevistas', 'Antecedentes', 'Lista de control', 'Informe'] as const;
type Pestana = typeof PESTANAS[number];

const HITOS: [keyof Exp['hitos'], string][] = [
  ['medidas_resguardo_en', 'Medidas de resguardo adoptadas el'],
  ['dt_informada_en', 'Dirección del Trabajo informada del inicio el'],
  ['decision_comunicada_en', 'Decisión comunicada por escrito a quien denuncia el'],
  ['investigacion_cerrada_en', 'Investigación concluida el'],
  ['informe_remitido_en', 'Informe remitido a la Dirección del Trabajo el'],
  ['pronunciamiento_notificado_en', 'Pronunciamiento de la Dirección del Trabajo notificado el'],
  ['medidas_aplicadas_en', 'Medidas o sanciones aplicadas el']
];

function Campo({ etq, valor, cambiar, tipo = 'text', area = 0, ayuda }: { etq: string; valor: string; cambiar: (v: string) => void; tipo?: string; area?: number; ayuda?: string }) {
  return (
    <label className="block">
      <span className="etiqueta">{etq}</span>
      {area ? <textarea className="campo" rows={area} value={valor} onChange={e => cambiar(e.target.value)} /> : <input className="campo" type={tipo} value={valor} onChange={e => cambiar(e.target.value)} />}
      {ayuda && <span className="ayuda">{ayuda}</span>}
    </label>
  );
}

export default function Expediente() {
  const { id = '' } = useParams();
  const { dek, estado } = useBoveda();
  const navegar = useNavigate();
  const [a, setA] = useState<Abierto | null | undefined>(undefined);
  const [sucio, setSucio] = useState(false);
  const [pestana, setPestana] = useState<Pestana>('Resumen y plazos');
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (dek) cargar(dek, id).then(setA).catch(e => setError(mensajeError(e))); }, [dek, id]);
  useEffect(() => {
    if (!sucio) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    addEventListener('beforeunload', h); return () => removeEventListener('beforeunload', h);
  }, [sucio]);

  const cambiar = useCallback((f: (e: Exp) => Exp) => { setA(x => x ? { ...x, e: f(structuredClone(x.e)) } : x); setSucio(true); setAviso(null); }, []);
  const hitos = useMemo(() => a ? calcularHitos(comoDenuncia(a.e), hoyEnChile(), a.e.inhabiles_extra) : [], [a]);

  if (estado !== 'abierta') return <Navigate to="/mesa" replace />;
  if (a === undefined) return <main className="mx-auto max-w-[1100px] px-4 py-10 text-suave">Abriendo expediente…</main>;
  if (a === null) return <main className="mx-auto max-w-[1100px] px-4 py-10"><p>No encontramos el expediente.</p><Link className="enlace" to="/mesa">Volver</Link></main>;
  const e = a.e;

  async function grabar() {
    setError(null);
    try {
      const r = await guardar(dek!, a!);
      if (!r) return setError('El expediente cambió en otra pestaña o equipo. Copie sus cambios, recargue la página y vuelva a aplicarlos.');
      setA(r); setSucio(false); setAviso('Guardado y cifrado.');
    } catch (er) { setError(mensajeError(er)); }
  }

  const parte = (p: Parte, i: number) => (
    <div key={p.id} className="tarjeta grid gap-3 p-5 md:grid-cols-3">
      <label className="block"><span className="etiqueta">Calidad</span>
        <select className="campo" value={p.calidad} onChange={ev => cambiar(x => { x.partes[i].calidad = ev.target.value as Parte['calidad']; return x; })}>
          {Object.entries(CALIDADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <Campo etq="Nombre completo" valor={p.nombre} cambiar={v => cambiar(x => { x.partes[i].nombre = v; return x; })} />
      <Campo etq="Cédula de identidad o pasaporte" valor={p.rut} cambiar={v => cambiar(x => { x.partes[i].rut = v; return x; })} />
      <Campo etq="Correo electrónico personal" tipo="email" valor={p.correo} cambiar={v => cambiar(x => { x.partes[i].correo = v; return x; })} />
      <Campo etq="Cargo o relación con la empresa" valor={p.cargo} cambiar={v => cambiar(x => { x.partes[i].cargo = v; return x; })} />
      <Campo etq="Forma de notificación pedida (si no es el correo)" valor={p.notificacion} cambiar={v => cambiar(x => { x.partes[i].notificacion = v; return x; })} ayuda="DS 21/2024, art. 4" />
      <div className="md:col-span-3"><button className="boton-s" onClick={() => cambiar(x => { x.partes.splice(i, 1); return x; })}><Trash2 className="size-4" aria-hidden />Quitar</button></div>
    </div>
  );

  const entrevista = (en: Entrevista, i: number) => {
    const p = e.partes.find(x => x.id === en.parteId);
    return (
      <div key={en.id} className="tarjeta space-y-3 p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="block md:col-span-2"><span className="etiqueta">Persona entrevistada</span>
            <select className="campo" value={en.parteId} onChange={ev => cambiar(x => { x.entrevistas[i].parteId = ev.target.value; return x; })}>
              <option value="">Elija una parte</option>
              {e.partes.map(pp => <option key={pp.id} value={pp.id}>{pp.nombre || 'Sin nombre'} · {CALIDADES[pp.calidad]}</option>)}
            </select>
          </label>
          <Campo etq="Fecha" tipo="date" valor={en.fecha} cambiar={v => cambiar(x => { x.entrevistas[i].fecha = v; return x; })} />
          <Campo etq="Hora" tipo="time" valor={en.hora} cambiar={v => cambiar(x => { x.entrevistas[i].hora = v; return x; })} />
          <Campo etq="Lugar" valor={en.lugar} cambiar={v => cambiar(x => { x.entrevistas[i].lugar = v; return x; })} />
          <label className="block"><span className="etiqueta">Modalidad</span>
            <select className="campo" value={en.modalidad} onChange={ev => cambiar(x => { x.entrevistas[i].modalidad = ev.target.value; return x; })}>
              <option>Presencial</option><option>Por videollamada</option>
            </select>
          </label>
        </div>
        <Campo etq="Declaración (preguntas y respuestas)" area={10} valor={en.relato} cambiar={v => cambiar(x => { x.entrevistas[i].relato = v; return x; })} />
        <Campo etq="Observaciones de quien investiga (no van en el acta)" area={2} valor={en.observaciones} cambiar={v => cambiar(x => { x.entrevistas[i].observaciones = v; return x; })} />
        <div className="flex flex-wrap gap-2">
          <Link className="boton-s" to={`/mesa/expediente/${id}/acta/${en.id}`} onClick={ev => { if (sucio) { ev.preventDefault(); setError('Guarde los cambios antes de abrir el acta.'); } }}><Printer className="size-4" aria-hidden />Acta para firmar{p ? '' : ' (elija la persona)'}</Link>
          <button className="boton-s" onClick={() => cambiar(x => { x.entrevistas.splice(i, 1); return x; })}><Trash2 className="size-4" aria-hidden />Quitar</button>
        </div>
      </div>
    );
  };

  const avance = avanceControl(e);
  const grupos = [...new Set(LISTA_CONTROL.map(i => i.grupo))];

  return (
    <main className="mx-auto max-w-[1100px] space-y-5 px-4 py-8 md:px-8">
      <Link to="/mesa" className="enlace inline-flex items-center gap-1 text-[0.9rem]" onClick={ev => { if (sucio && !confirm('Hay cambios sin guardar. ¿Salir igual?')) ev.preventDefault(); }}><ArrowLeft className="size-4" aria-hidden />Expedientes</Link>
      <div className="sticky top-[60px] z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-borde bg-fondo/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="min-w-0">
          <h1 className="titulo truncate text-[1.6rem]">{e.referencia}</h1>
          <p className="ayuda">{sucio ? 'Cambios sin guardar' : aviso ?? `Guardado ${new Date(a.actualizado_en).toLocaleString('es-CL')}`}</p>
        </div>
        <button className="boton" onClick={grabar} disabled={!sucio}><Save className="size-4" aria-hidden />Guardar</button>
      </div>
      {error && <p role="alert" className="rounded-xl bg-rosa px-4 py-3 text-[0.9rem] text-riesgo">{error}</p>}

      <nav className="flex gap-1 overflow-x-auto" aria-label="Secciones del expediente">
        {PESTANAS.map(p => (
          <button key={p} onClick={() => setPestana(p)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-[0.9rem] font-medium ${pestana === p ? 'bg-menta-f text-primario-f' : 'text-suave hover:bg-menta'}`}>
            {p}{p === 'Lista de control' ? ` ${avance.hechos}/${avance.total}` : p === 'Partes' ? ` (${e.partes.length})` : p === 'Entrevistas' ? ` (${e.entrevistas.length})` : ''}
          </button>
        ))}
      </nav>

      {pestana === 'Resumen y plazos' && (
        <div className="space-y-5">
          <RelojPlazos hitos={hitos} />
          <button className="boton-s" onClick={() => descargar('plazos-expediente.ics', calendarioIcs(e.referencia, hitos, location.origin + '/mesa'), 'text/calendar;charset=utf-8')}><CalendarPlus className="size-4" aria-hidden />Agregar plazos a mi calendario</button>
          <section className="tarjeta grid gap-4 p-6 md:grid-cols-3">
            <h2 className="titulo text-[1.2rem] md:col-span-3">Caso</h2>
            <Campo etq="Referencia" valor={e.referencia} cambiar={v => cambiar(x => { x.referencia = v; return x; })} />
            <Campo etq="Fecha de presentación de la denuncia" tipo="date" valor={e.denuncia.recibida} cambiar={v => cambiar(x => { x.denuncia.recibida = v; return x; })} ayuda="Desde aquí corren los 30 días (art. 17)." />
            <label className="block"><span className="etiqueta">Conducta denunciada</span>
              <select className="campo" value={e.denuncia.tipos[0] ?? ''} onChange={ev => cambiar(x => { x.denuncia.tipos = ev.target.value ? [ev.target.value] : []; return x; })}>
                <option value="">Sin indicar</option>{Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <div className="md:col-span-3"><Campo etq="Resumen de la denuncia" area={3} valor={e.denuncia.resumen} cambiar={v => cambiar(x => { x.denuncia.resumen = v; return x; })} /></div>
          </section>
          <section className="tarjeta grid gap-4 p-6 md:grid-cols-3">
            <h2 className="titulo text-[1.2rem] md:col-span-3">Empresa (cliente)</h2>
            <Campo etq="Razón social" valor={e.cliente.nombre} cambiar={v => cambiar(x => { x.cliente.nombre = v; return x; })} />
            <Campo etq="RUT" valor={e.cliente.rut} cambiar={v => cambiar(x => { x.cliente.rut = v; return x; })} />
            <Campo etq="Correo electrónico" tipo="email" valor={e.cliente.correo} cambiar={v => cambiar(x => { x.cliente.correo = v; return x; })} />
          </section>
          <section className="tarjeta grid gap-4 p-6 md:grid-cols-4">
            <h2 className="titulo text-[1.2rem] md:col-span-4">Persona a cargo de la investigación</h2>
            <Campo etq="Nombre" valor={e.investigador.nombre} cambiar={v => cambiar(x => { x.investigador.nombre = v; return x; })} />
            <Campo etq="Cédula de identidad" valor={e.investigador.rut} cambiar={v => cambiar(x => { x.investigador.rut = v; return x; })} />
            <Campo etq="Correo electrónico" tipo="email" valor={e.investigador.correo} cambiar={v => cambiar(x => { x.investigador.correo = v; return x; })} />
            <Campo etq="Designada el" tipo="date" valor={e.investigador.designado_en} cambiar={v => cambiar(x => { x.investigador.designado_en = v; return x; })} />
            <label className="flex items-start gap-2 text-[0.92rem] md:col-span-2"><input type="checkbox" className="mt-1 accent-[#047857]" checked={e.imparcialidad.antecedentes} onChange={ev => cambiar(x => { x.imparcialidad.antecedentes = ev.target.checked; return x; })} />Se presentaron antecedentes sobre la imparcialidad de quien investiga (art. 14)</label>
            <label className="flex items-start gap-2 text-[0.92rem] md:col-span-2"><input type="checkbox" className="mt-1 accent-[#047857]" checked={e.imparcialidad.cambio} onChange={ev => cambiar(x => { x.imparcialidad.cambio = ev.target.checked; return x; })} />El empleador decidió cambiar a quien investiga</label>
            {e.imparcialidad.antecedentes && <div className="md:col-span-4"><Campo etq="Antecedentes presentados y decisión fundada del empleador" area={3} valor={e.imparcialidad.detalle} cambiar={v => cambiar(x => { x.imparcialidad.detalle = v; return x; })} /></div>}
          </section>
          <section className="tarjeta grid gap-4 p-6 md:grid-cols-2">
            <h2 className="titulo text-[1.2rem] md:col-span-2">Hitos y medidas</h2>
            {HITOS.map(([k, etq]) => <Campo key={k} etq={etq} tipo="date" valor={e.hitos[k]} cambiar={v => cambiar(x => { x.hitos[k] = v; return x; })} />)}
            <div className="md:col-span-2"><Campo etq="Medidas de resguardo adoptadas" area={3} valor={e.medidas_resguardo} cambiar={v => cambiar(x => { x.medidas_resguardo = v; return x; })} /></div>
            <div className="md:col-span-2"><Campo etq="Notificaciones realizadas" area={3} valor={e.notificaciones} cambiar={v => cambiar(x => { x.notificaciones = v; return x; })} ayuda="Van en el informe (art. 16 d)." /></div>
          </section>
          <section className="tarjeta p-6">
            <h2 className="titulo text-[1.2rem]">Días inhábiles adicionales</h2>
            <p className="ayuda mb-2">Feriados regionales o por elecciones que rijan en la empresa. Los nacionales ya están considerados.</p>
            <div className="mb-2 flex flex-wrap gap-2">{e.inhabiles_extra.map(d => <span key={d} className="pildora bg-gris text-texto">{fechaLarga(d, false)}<button aria-label={`Quitar ${d}`} onClick={() => cambiar(x => { x.inhabiles_extra = x.inhabiles_extra.filter(y => y !== d); return x; })}><Trash2 className="size-3.5 text-suave" /></button></span>)}</div>
            <input className="campo max-w-[200px]" type="date" aria-label="Agregar día inhábil" onChange={ev => { const v = ev.target.value; if (v) cambiar(x => { x.inhabiles_extra = [...new Set([...x.inhabiles_extra, v])].sort(); return x; }); ev.target.value = ''; }} />
          </section>
          <section className="tarjeta p-6">
            <h2 className="titulo text-[1.2rem] text-riesgo">Eliminar expediente</h2>
            <p className="ayuda mb-2">Borra el expediente de forma definitiva. Antes, asegúrese de conservar el informe y las actas firmadas según corresponda.</p>
            <button className="boton-s" onClick={async () => { if (confirm('¿Eliminar este expediente de forma definitiva?')) { await borrar(id); navegar('/mesa'); } }}><Trash2 className="size-4" aria-hidden />Eliminar</button>
          </section>
        </div>
      )}

      {pestana === 'Partes' && (
        <div className="space-y-4">
          <p className="ayuda">Todas las personas participantes deben informar un correo electrónico personal para notificaciones, salvo que pidan otra forma por escrito (DS 21/2024, art. 4).</p>
          {e.partes.map(parte)}
          <button className="boton-s" onClick={() => cambiar(x => { x.partes.push({ id: nuevoId(), calidad: x.partes.length ? 'testigo' : 'afectada', nombre: '', rut: '', correo: '', cargo: '', notificacion: '' }); return x; })}><Plus className="size-4" aria-hidden />Agregar persona</button>
        </div>
      )}

      {pestana === 'Entrevistas' && (
        <div className="space-y-4">
          <p className="ayuda">Cada declaración debe constar por escrito, en papel y con firma de quienes comparecen en todas sus hojas (DS 21/2024, art. 15). El acta imprime las líneas de firma al pie de cada hoja.</p>
          {e.entrevistas.map(entrevista)}
          <button className="boton-s" onClick={() => cambiar(x => { x.entrevistas.push({ id: nuevoId(), parteId: '', fecha: hoyEnChile(), hora: '', lugar: '', modalidad: 'Presencial', relato: '', observaciones: '' }); return x; })}><Plus className="size-4" aria-hidden />Agregar entrevista</button>
        </div>
      )}

      {pestana === 'Antecedentes' && (
        <div className="space-y-3">
          <p className="ayuda">Documentos y otros antecedentes revisados. Para los que exige considerar el art. 15, use la lista de control.</p>
          {e.antecedentes.map((an, i) => (
            <div key={an.id} className="tarjeta grid gap-3 p-4 md:grid-cols-[180px_1fr_auto] md:items-end">
              <Campo etq="Fecha" tipo="date" valor={an.fecha} cambiar={v => cambiar(x => { x.antecedentes[i].fecha = v; return x; })} />
              <Campo etq="Descripción" valor={an.descripcion} cambiar={v => cambiar(x => { x.antecedentes[i].descripcion = v; return x; })} />
              <button className="boton-s" aria-label="Quitar" onClick={() => cambiar(x => { x.antecedentes.splice(i, 1); return x; })}><Trash2 className="size-4" /></button>
            </div>
          ))}
          <button className="boton-s" onClick={() => cambiar(x => { x.antecedentes.push({ id: nuevoId(), fecha: hoyEnChile(), descripcion: '' }); return x; })}><Plus className="size-4" aria-hidden />Agregar antecedente</button>
        </div>
      )}

      {pestana === 'Lista de control' && (
        <div className="space-y-5">
          {grupos.map(g => (
            <section key={g} className="tarjeta p-5">
              <h2 className="titulo mb-3 text-[1.15rem]">{g}</h2>
              <ul className="space-y-3">
                {LISTA_CONTROL.filter(i => i.grupo === g).map(i => {
                  const c = e.control[i.id] ?? { hecho: false };
                  return (
                    <li key={i.id} className="grid gap-2 md:grid-cols-[1fr_170px_minmax(0,240px)] md:items-start">
                      <label className="flex items-start gap-2 text-[0.93rem]">
                        <input type="checkbox" className="mt-1 accent-[#047857]" checked={c.hecho} onChange={ev => cambiar(x => { x.control[i.id] = { ...c, hecho: ev.target.checked, fecha: ev.target.checked ? (c.fecha || hoyEnChile()) : c.fecha }; return x; })} />
                        <span>{i.texto}{i.condicional && <span className="ayuda"> (si corresponde)</span>}<span className="ayuda block">{i.base}</span></span>
                      </label>
                      <input className="campo" type="date" aria-label="Fecha" value={c.fecha ?? ''} onChange={ev => cambiar(x => { x.control[i.id] = { ...c, fecha: ev.target.value }; return x; })} />
                      <input className="campo" aria-label="Nota" placeholder="Nota" value={c.nota ?? ''} onChange={ev => cambiar(x => { x.control[i.id] = { ...c, nota: ev.target.value }; return x; })} />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {pestana === 'Informe' && (
        <div className="space-y-4">
          <p className="ayuda">Las letras a) a e) se completan con los datos del expediente. Aquí redacta el resto del contenido mínimo del informe (DS 21/2024, art. 16).</p>
          <section className="tarjeta space-y-4 p-6">
            <Campo etq="f) Relación de los hechos denunciados" area={6} valor={e.informe.hechos} cambiar={v => cambiar(x => { x.informe.hechos = v; return x; })} />
            <Campo etq="f) Declaraciones recibidas" area={6} valor={e.informe.declaraciones} cambiar={v => cambiar(x => { x.informe.declaraciones = v; return x; })} />
            <Campo etq="f) Alegaciones planteadas" area={4} valor={e.informe.alegaciones} cambiar={v => cambiar(x => { x.informe.alegaciones = v; return x; })} />
            <Campo etq="g) Indicios o razonamientos coherentes y congruentes que fundan las conclusiones" area={8} valor={e.informe.razonamiento} cambiar={v => cambiar(x => { x.informe.razonamiento = v; return x; })} />
            <Campo etq="g) Conclusión: si los hechos constituyen o no acoso sexual, laboral o violencia en el trabajo" area={3} valor={e.informe.conclusion} cambiar={v => cambiar(x => { x.informe.conclusion = v; return x; })} />
            <Campo etq="h) Propuesta de medidas correctivas" area={4} valor={e.informe.correctivas} cambiar={v => cambiar(x => { x.informe.correctivas = v; return x; })} />
            <Campo etq="i) Propuesta de sanciones" area={4} valor={e.informe.sanciones} cambiar={v => cambiar(x => { x.informe.sanciones = v; return x; })} ayuda="Si se trata de la causal del art. 160 N.º 1 letra f) del Código del Trabajo, evalúe la gravedad; puede proponer las sanciones del reglamento interno." />
          </section>
          <Link className="boton" to={`/mesa/expediente/${id}/informe`} onClick={ev => { if (sucio) { ev.preventDefault(); setError('Guarde los cambios antes de abrir el informe.'); } }}><FileText className="size-4" aria-hidden />Ver informe para imprimir o descargar</Link>
        </div>
      )}
    </main>
  );
}
