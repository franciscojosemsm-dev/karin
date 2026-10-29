import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, FileDown } from 'lucide-react';
import { useBoveda } from '../lib/boveda';
import { cargar, type Abierto } from '../lib/expedientes';
import { CALIDADES, type Expediente } from '../lib/expediente';
import { fechaLarga, hoyEnChile } from '../lib/fechas';
import { TIPOS } from '../lib/tipos';
import { descargar } from '../lib/ics';

/* Documento imprimible con la marca de la consultora; también se descarga como archivo para Word. */
function Hoja({ titulo, archivo, marca, children, acta = false }: { titulo: string; archivo: string; marca: string; children: ReactNode; acta?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { id = '' } = useParams();
  function word() {
    const html = `<html><head><meta charset="utf-8"><title>${titulo}</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1c2725}h1{font-size:16pt}h2{font-size:12.5pt;margin-top:14pt}p,li{line-height:1.4}.marca{color:#047857;font-weight:bold}</style></head><body>${ref.current!.innerHTML}</body></html>`;
    descargar(archivo, html, 'application/msword');
  }
  return (
    <main className="mx-auto max-w-[820px] px-4 py-8">
      <div className="no-imprimir mb-5 flex flex-wrap items-center justify-between gap-2">
        <Link to={`/mesa/expediente/${id}`} className="enlace inline-flex items-center gap-1 text-[0.9rem]"><ArrowLeft className="size-4" aria-hidden />Expediente</Link>
        <div className="flex gap-2">
          <button className="boton" onClick={() => print()}><Printer className="size-4" aria-hidden />Imprimir</button>
          <button className="boton-s" onClick={word}><FileDown className="size-4" aria-hidden />Descargar para Word</button>
        </div>
      </div>
      <article ref={ref} className={`documento tarjeta space-y-3 p-8 text-[0.95rem] leading-relaxed md:p-12 ${acta ? 'hoja-acta' : ''}`}>
        <p className="marca text-[0.85rem] font-semibold uppercase tracking-[0.08em] text-primario">{marca}</p>
        {children}
      </article>
    </main>
  );
}

function useExpediente() {
  const { id = '' } = useParams();
  const { dek, estado, marca } = useBoveda();
  const [a, setA] = useState<Abierto | null | undefined>(undefined);
  useEffect(() => { if (dek) cargar(dek, id).then(setA); }, [dek, id]);
  return { a, estado, marca };
}

const Dato = ({ k, v }: { k: string; v: ReactNode }) => <p><b>{k}:</b> {v || '—'}</p>;
const tipos = (e: Expediente) => e.denuncia.tipos.map(t => TIPOS[t]).join(', ') || 'acoso o violencia en el trabajo';

export function Acta() {
  const { eid = '' } = useParams();
  const { a, estado, marca } = useExpediente();
  if (estado !== 'abierta') return <Navigate to="/mesa" replace />;
  if (!a) return <main className="p-10 text-suave">Abriendo…</main>;
  const e = a.e, en = e.entrevistas.find(x => x.id === eid);
  if (!en) return <main className="p-10">No encontramos la entrevista.</main>;
  const p = e.partes.find(x => x.id === en.parteId);
  return (
    <Hoja titulo="Acta de declaración" archivo={`acta-${(p?.nombre || 'declaracion').replace(/\W+/g, '-')}-${en.fecha}.doc`} marca={marca}
      acta>
      <h1 className="titulo text-[1.5rem]">Acta de declaración</h1>
      <p>Investigación de denuncia por {tipos(e).toLowerCase()} · Ley 21.643 y DS N.º 21 de 2024</p>
      <Dato k="Referencia" v={e.referencia} />
      <Dato k="Empresa" v={`${e.cliente.nombre}${e.cliente.rut ? `, RUT ${e.cliente.rut}` : ''}`} />
      <Dato k="Fecha y hora" v={`${fechaLarga(en.fecha)}${en.hora ? `, ${en.hora} horas` : ''}`} />
      <Dato k="Lugar y modalidad" v={`${en.lugar || '—'} · ${en.modalidad}`} />
      <h2 className="titulo mt-4 text-[1.15rem]">Persona compareciente</h2>
      <Dato k="Nombre" v={p?.nombre} /><Dato k="Cédula de identidad" v={p?.rut} /><Dato k="Calidad" v={p ? CALIDADES[p.calidad] : ''} />
      <Dato k="Cargo o relación con la empresa" v={p?.cargo} /><Dato k="Correo electrónico para notificaciones" v={p?.notificacion || p?.correo} />
      <Dato k="Persona a cargo de la investigación" v={e.investigador.nombre} />
      <h2 className="titulo mt-4 text-[1.15rem]">Información entregada antes de declarar</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>El objeto de esta diligencia, en el marco de una investigación regida por la Ley 21.643 y el DS N.º 21 de 2024.</li>
        <li>El deber de resguardar la información a la que acceda o conozca en el procedimiento (art. 2, letra d).</li>
        <li>Su derecho a ser oída, a fundamentar sus dichos y a aportar antecedentes (arts. 2, letra h, y 15).</li>
        <li>Que puede presentar antecedentes que afecten la imparcialidad de quien investiga y pedir su cambio (art. 14).</li>
        {p?.calidad === 'testigo' && <li>Su deber de colaborar con la correcta sustanciación del procedimiento (arts. 2, letra i, y 8).</li>}
      </ul>
      <h2 className="titulo mt-4 text-[1.15rem]">Declaración</h2>
      <p className="whitespace-pre-wrap">{en.relato || '—'}</p>
      <p className="mt-6">Leída la presente acta, la persona compareciente la ratifica y la firma en todas sus hojas junto a quien investiga.</p>
      <div className="mt-12 grid grid-cols-2 gap-10 text-center text-[0.9rem]">
        <div className="border-t border-texto pt-2">{p?.nombre || 'Persona compareciente'}<br />{p?.rut}</div>
        <div className="border-t border-texto pt-2">{e.investigador.nombre || 'Persona a cargo de la investigación'}<br />{e.investigador.rut}</div>
      </div>
    </Hoja>
  );
}

export function Informe() {
  const { a, estado, marca } = useExpediente();
  if (estado !== 'abierta') return <Navigate to="/mesa" replace />;
  if (!a) return <main className="p-10 text-suave">Abriendo…</main>;
  const e = a.e;
  const persona = (c: string) => e.partes.filter(p => p.calidad === c);
  const nombreEnInforme = (pid: string) => {
    const p = e.partes.find(x => x.id === pid);
    if (!p) return 'Persona sin identificar';
    return p.calidad === 'testigo' ? `Testigo ${e.partes.filter(x => x.calidad === 'testigo').indexOf(p) + 1}` : `${CALIDADES[p.calidad]}: ${p.nombre}`;
  };
  const texto = (t: string) => <p className="whitespace-pre-wrap">{t || '—'}</p>;
  return (
    <Hoja titulo="Informe de investigación" archivo={`informe-${e.referencia.replace(/\W+/g, '-')}.doc`} marca={marca}>
      <h1 className="titulo text-[1.6rem]">Informe de investigación</h1>
      <p>Denuncia por {tipos(e).toLowerCase()} · Ley 21.643 y DS N.º 21 de 2024, art. 16</p>
      <Dato k="Referencia" v={e.referencia} /><Dato k="Fecha de presentación de la denuncia" v={fechaLarga(e.denuncia.recibida)} /><Dato k="Fecha del informe" v={fechaLarga(hoyEnChile())} />

      <h2 className="titulo mt-5 text-[1.15rem]">a) Empresa</h2>
      <Dato k="Nombre" v={e.cliente.nombre} /><Dato k="RUT" v={e.cliente.rut} /><Dato k="Correo electrónico" v={e.cliente.correo} />

      <h2 className="titulo mt-5 text-[1.15rem]">b) Persona denunciante y persona denunciada</h2>
      {[...persona('afectada'), ...persona('denunciante'), ...persona('denunciada')].map(p => (
        <p key={p.id}><b>{CALIDADES[p.calidad]}:</b> {p.nombre} · cédula {p.rut || '—'} · {p.correo || '—'}</p>
      ))}

      <h2 className="titulo mt-5 text-[1.15rem]">c) Persona a cargo de la investigación</h2>
      <p>{e.investigador.nombre || '—'} · cédula {e.investigador.rut || '—'} · {e.investigador.correo || '—'}{e.investigador.designado_en ? ` · designada el ${fechaLarga(e.investigador.designado_en, false)}` : ''}</p>
      <p>{e.imparcialidad.antecedentes ? `Se recibieron antecedentes sobre su imparcialidad. ${e.imparcialidad.cambio ? 'El empleador decidió cambiar a la persona investigadora.' : 'El empleador decidió mantenerla.'}` : 'No se recibieron antecedentes sobre su imparcialidad.'}</p>
      {e.imparcialidad.antecedentes && texto(e.imparcialidad.detalle)}

      <h2 className="titulo mt-5 text-[1.15rem]">d) Medidas de resguardo y notificaciones</h2>
      {texto(`${e.medidas_resguardo}${e.hitos.medidas_resguardo_en ? `\nAdoptadas el ${fechaLarga(e.hitos.medidas_resguardo_en, false)}.` : ''}`.trim())}
      {texto(e.notificaciones)}

      <h2 className="titulo mt-5 text-[1.15rem]">e) Antecedentes y entrevistas</h2>
      <p className="text-[0.88rem] text-suave">Se individualizan con resguardo de la confidencialidad de los participantes: los testigos se identifican por número.</p>
      <ul className="list-disc pl-6">
        {e.entrevistas.map(en => <li key={en.id}>Entrevista del {fechaLarga(en.fecha, false)} · {nombreEnInforme(en.parteId)} · {en.modalidad.toLowerCase()}</li>)}
        {e.antecedentes.map(an => <li key={an.id}>{an.descripcion} ({fechaLarga(an.fecha, false)})</li>)}
        {e.entrevistas.length + e.antecedentes.length === 0 && <li>—</li>}
      </ul>

      <h2 className="titulo mt-5 text-[1.15rem]">f) Relación de los hechos, declaraciones y alegaciones</h2>
      <h3 className="font-semibold">Hechos denunciados</h3>{texto(e.informe.hechos)}
      <h3 className="font-semibold">Declaraciones recibidas</h3>{texto(e.informe.declaraciones)}
      <h3 className="font-semibold">Alegaciones planteadas</h3>{texto(e.informe.alegaciones)}

      <h2 className="titulo mt-5 text-[1.15rem]">g) Fundamentos y conclusiones</h2>
      {texto(e.informe.razonamiento)}
      <h3 className="font-semibold">Conclusión</h3>{texto(e.informe.conclusion)}

      <h2 className="titulo mt-5 text-[1.15rem]">h) Medidas correctivas propuestas</h2>{texto(e.informe.correctivas)}
      <h2 className="titulo mt-5 text-[1.15rem]">i) Sanciones propuestas</h2>{texto(e.informe.sanciones)}

      <div className="mt-14 w-64 border-t border-texto pt-2 text-center text-[0.9rem]">{e.investigador.nombre || 'Persona a cargo de la investigación'}<br />{marca}</div>
    </Hoja>
  );
}
