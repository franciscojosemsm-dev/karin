import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { TIPOS, VIAS } from '../lib/tipos';
import { rutValido, correoValido } from '../lib/rut';

export type DatosDenuncia = {
  tipos: string[];
  afectado: { nombre: string; rut: string; correo: string; telefono: string; cargo: string };
  denunciante?: { nombre: string; rut: string; correo: string; representacion: string };
  denunciados: { nombre: string; cargo: string }[];
  vinculo: string; hechos: string; testigos: string;
  solicita_derivacion: boolean; contra_representante: boolean;
};

/* Contenido mínimo de la denuncia según el DS 21/2024, art. 11: identificación de la persona afectada (nombre, cédula y
   correo personal) y, si denuncia otra persona, la suya y la representación; personas denunciadas y cargos; vínculo; hechos. */
export default function FormularioDenuncia({ interno = false, onEnviar }: {
  interno?: boolean;
  onEnviar: (datos: DatosDenuncia, via: string) => Promise<string | null>;
}) {
  const [tipos, setTipos] = useState<string[]>([]);
  const [af, setAf] = useState({ nombre: '', rut: '', correo: '', telefono: '', cargo: '' });
  const [otro, setOtro] = useState(false);
  const [den, setDen] = useState({ nombre: '', rut: '', correo: '', representacion: '' });
  const [denunciados, setDenunciados] = useState([{ nombre: '', cargo: '' }]);
  const [vinculo, setVinculo] = useState('');
  const [hechos, setHechos] = useState('');
  const [testigos, setTestigos] = useState('');
  const [derivar, setDerivar] = useState(false);
  const [representante, setRepresentante] = useState(false);
  const [via, setVia] = useState('verbal');
  const [acepto, setAcepto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function validar(): string | null {
    if (!tipos.length) return 'Indique qué tipo de conducta denuncia.';
    if (af.nombre.trim().length < 2) return 'Escriba el nombre completo de la persona afectada.';
    if (!rutValido(af.rut)) return 'El RUT de la persona afectada no es válido.';
    if (!correoValido(af.correo)) return 'El correo de la persona afectada no es válido.';
    if (otro) {
      if (den.nombre.trim().length < 2) return 'Escriba el nombre de quien presenta la denuncia.';
      if (den.rut && !rutValido(den.rut)) return 'El RUT de quien presenta la denuncia no es válido.';
      if (den.correo && !correoValido(den.correo)) return 'El correo de quien presenta la denuncia no es válido.';
      if (den.representacion.trim().length < 3) return 'Indique en qué calidad presenta la denuncia por la persona afectada.';
    }
    if (hechos.trim().length < 20) return 'Relate los hechos con algo más de detalle (al menos 20 caracteres).';
    if (!interno && !acepto) return 'Debe confirmar que leyó la información sobre el procedimiento y sus datos.';
    return null;
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const v = validar();
    setError(v);
    if (v) return;
    setEnviando(true);
    const err = await onEnviar({
      tipos, afectado: af, denunciante: otro ? den : undefined,
      denunciados: denunciados.filter(d => d.nombre.trim() || d.cargo.trim()),
      vinculo, hechos, testigos, solicita_derivacion: derivar, contra_representante: representante
    }, via);
    setEnviando(false);
    setError(err);
  }

  const campo = (etq: string, valor: string, cambiar: (v: string) => void, extra: Record<string, unknown> = {}) => (
    <label className="block">
      <span className="etiqueta">{etq}</span>
      <input className="campo" value={valor} onChange={e => cambiar(e.target.value)} {...extra} />
    </label>
  );

  return (
    <form onSubmit={enviar} className="space-y-7" noValidate>
      {interno && (
        <fieldset>
          <legend className="etiqueta">¿Cómo se recibió la denuncia?</legend>
          <select className="campo" value={via} onChange={e => setVia(e.target.value)}>
            {Object.entries(VIAS).filter(([k]) => k !== 'canal').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {via === 'verbal' && <p className="ayuda mt-1">Si la denuncia fue verbal, el reglamento exige levantar un acta y entregar copia fechada, timbrada y con la hora (DS 21/2024, art. 12). Al registrarla aquí obtendrá un comprobante para imprimir.</p>}
        </fieldset>
      )}

      <fieldset>
        <legend className="etiqueta">¿Qué conducta denuncia? Puede marcar más de una.</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {Object.entries(TIPOS).map(([k, v]) => (
            <label key={k} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-[0.92rem] ${tipos.includes(k) ? 'border-primario bg-menta' : 'border-borde bg-white'}`}>
              <input type="checkbox" className="mt-1 accent-[#047857]" checked={tipos.includes(k)} onChange={e => setTipos(t => e.target.checked ? [...t, k] : t.filter(x => x !== k))} />
              {v}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="titulo mb-1 text-[1.2rem]">Persona afectada</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {campo('Nombre completo', af.nombre, v => setAf({ ...af, nombre: v }), { autoComplete: 'name' })}
          {campo('RUT o cédula de identidad', af.rut, v => setAf({ ...af, rut: v }), { placeholder: '12.345.678-5' })}
          {campo('Correo electrónico personal', af.correo, v => setAf({ ...af, correo: v }), { type: 'email', autoComplete: 'email' })}
          {campo('Teléfono (opcional)', af.telefono, v => setAf({ ...af, telefono: v }), { type: 'tel', autoComplete: 'tel' })}
          {campo('Cargo o función (opcional)', af.cargo, v => setAf({ ...af, cargo: v }))}
        </div>
        <label className="flex items-start gap-2 text-[0.92rem]">
          <input type="checkbox" className="mt-1 accent-[#047857]" checked={otro} onChange={e => setOtro(e.target.checked)} />
          Presento la denuncia por otra persona (la persona afectada es distinta de quien denuncia).
        </label>
        {otro && (
          <div className="grid gap-3 rounded-xl bg-gris p-4 sm:grid-cols-2">
            {campo('Nombre de quien denuncia', den.nombre, v => setDen({ ...den, nombre: v }))}
            {campo('RUT de quien denuncia', den.rut, v => setDen({ ...den, rut: v }))}
            {campo('Correo de quien denuncia', den.correo, v => setDen({ ...den, correo: v }), { type: 'email' })}
            {campo('Calidad o representación que invoca', den.representacion, v => setDen({ ...den, representacion: v }), { placeholder: 'Ej.: dirigente sindical, mandatario' })}
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="titulo mb-1 text-[1.2rem]">Persona o personas denunciadas</legend>
        <p className="ayuda -mt-1">Indique su nombre y cargo cuando sea posible.</p>
        {denunciados.map((d, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            {campo('Nombre', d.nombre, v => setDenunciados(l => l.map((x, j) => j === i ? { ...x, nombre: v } : x)))}
            {campo('Cargo o relación con la empresa', d.cargo, v => setDenunciados(l => l.map((x, j) => j === i ? { ...x, cargo: v } : x)))}
            {denunciados.length > 1 && <button type="button" className="boton-s" aria-label="Quitar persona" onClick={() => setDenunciados(l => l.filter((_, j) => j !== i))}><Trash2 className="size-4" /></button>}
          </div>
        ))}
        {denunciados.length < 5 && <button type="button" className="enlace inline-flex items-center gap-1 text-[0.9rem]" onClick={() => setDenunciados(l => [...l, { nombre: '', cargo: '' }])}><Plus className="size-4" />Agregar otra persona</button>}
        <label className="block">
          <span className="etiqueta">Vínculo con la persona afectada</span>
          <textarea className="campo" rows={2} value={vinculo} onChange={e => setVinculo(e.target.value)} placeholder="Ej.: es mi jefatura directa; es un cliente de la empresa" />
        </label>
        <label className="flex items-start gap-2 text-[0.92rem]">
          <input type="checkbox" className="mt-1 accent-[#047857]" checked={representante} onChange={e => setRepresentante(e.target.checked)} />
          <span>La denuncia se dirige contra el empleador o quien lo representa (gerente, administrador u otra persona que ejerce habitualmente su dirección). En ese caso se deriva siempre a la Dirección del Trabajo.</span>
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="titulo mb-1 text-[1.2rem]">Los hechos</legend>
        <label className="block">
          <span className="etiqueta">Relato de lo ocurrido</span>
          <textarea className="campo" rows={8} maxLength={20000} value={hechos} onChange={e => setHechos(e.target.value)}
            placeholder="Describa qué ocurrió, cuándo y dónde, con el detalle que pueda. Si fueron varios hechos, indíquelos por fecha." />
          <span className="ayuda">{hechos.length} / 20.000</span>
        </label>
        <label className="block">
          <span className="etiqueta">Testigos u otros antecedentes (opcional)</span>
          <textarea className="campo" rows={3} value={testigos} onChange={e => setTestigos(e.target.value)} placeholder="Personas que presenciaron los hechos, mensajes, correos u otros antecedentes que pueda aportar en la investigación." />
        </label>
      </fieldset>

      <fieldset className="space-y-3 rounded-2xl border border-borde bg-white p-5">
        <legend className="titulo px-1 text-[1.1rem]">Qué ocurre después</legend>
        <ul className="list-disc space-y-1.5 pl-5 text-[0.92rem] text-suave">
          <li>La empresa debe adoptar de inmediato medidas de resguardo, entre ellas su derivación a la atención psicológica temprana del organismo administrador de la Ley 16.744 (mutualidad o ISL).</li>
          <li>La empresa puede investigar internamente o derivar la denuncia a la Dirección del Trabajo; en ambos casos debe informárselo por escrito. Usted puede pedir que se derive a la Dirección del Trabajo.</li>
          <li>La denuncia no se somete a un control de admisibilidad: será tramitada.</li>
          <li>Su identidad solo la ven las personas que la empresa designó para tramitar denuncias.</li>
        </ul>
        <label className="flex items-start gap-2 text-[0.92rem]">
          <input type="checkbox" className="mt-1 accent-[#047857]" checked={derivar} onChange={e => setDerivar(e.target.checked)} />
          Pido que la denuncia se derive a la Dirección del Trabajo.
        </label>
        {!interno && (
          <label className="flex items-start gap-2 text-[0.92rem]">
            <input type="checkbox" className="mt-1 accent-[#047857]" checked={acepto} onChange={e => setAcepto(e.target.checked)} />
            <span>Leí esta información. Entiendo que mis datos y los de esta denuncia serán tratados por la empresa para tramitarla conforme a la Ley 21.643 (<a className="enlace" href="/privacidad" target="_blank" rel="noreferrer">más información</a>).</span>
          </label>
        )}
      </fieldset>

      {error && <p role="alert" className="rounded-xl bg-rosa px-4 py-3 text-[0.92rem] text-riesgo">{error}</p>}
      <button className="boton w-full sm:w-auto" disabled={enviando}>{enviando ? 'Enviando…' : interno ? 'Registrar denuncia' : 'Enviar denuncia'}</button>
    </form>
  );
}
