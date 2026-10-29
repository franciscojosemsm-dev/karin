/* Contenido de un expediente de investigación. Todo esto viaja cifrado: el servidor no ve ningún campo. */
import type { Fecha } from './fechas';
import type { Denuncia } from './plazos';

export type Calidad = 'afectada' | 'denunciante' | 'denunciada' | 'testigo';
export const CALIDADES: Record<Calidad, string> = { afectada: 'Persona afectada', denunciante: 'Persona denunciante', denunciada: 'Persona denunciada', testigo: 'Testigo' };

export type Parte = { id: string; calidad: Calidad; nombre: string; rut: string; correo: string; cargo: string; notificacion: string };
export type Entrevista = { id: string; parteId: string; fecha: Fecha; hora: string; lugar: string; modalidad: string; relato: string; observaciones: string };
export type Antecedente = { id: string; fecha: Fecha; descripcion: string };
export type Control = { hecho: boolean; fecha?: Fecha; nota?: string };

export type Expediente = {
  referencia: string;
  cliente: { nombre: string; rut: string; correo: string };
  denuncia: { recibida: Fecha; via: string; tipos: string[]; resumen: string; derivacion_obligatoria: boolean };
  investigador: { nombre: string; rut: string; correo: string; designado_en: Fecha | '' };
  imparcialidad: { antecedentes: boolean; detalle: string; cambio: boolean };
  hitos: {
    medidas_resguardo_en: Fecha | ''; dt_informada_en: Fecha | ''; decision_comunicada_en: Fecha | ''; investigacion_cerrada_en: Fecha | '';
    informe_remitido_en: Fecha | ''; pronunciamiento_notificado_en: Fecha | ''; medidas_aplicadas_en: Fecha | '';
  };
  medidas_resguardo: string;
  notificaciones: string;
  partes: Parte[];
  entrevistas: Entrevista[];
  antecedentes: Antecedente[];
  control: Record<string, Control>;
  informe: { hechos: string; declaraciones: string; alegaciones: string; razonamiento: string; conclusion: string; correctivas: string; sanciones: string };
  inhabiles_extra: Fecha[];
};

export const id = () => crypto.randomUUID();

export function nuevoExpediente(referencia: string, recibida: Fecha): Expediente {
  return {
    referencia, cliente: { nombre: '', rut: '', correo: '' },
    denuncia: { recibida, via: 'escrita', tipos: [], resumen: '', derivacion_obligatoria: false },
    investigador: { nombre: '', rut: '', correo: '', designado_en: '' },
    imparcialidad: { antecedentes: false, detalle: '', cambio: false },
    hitos: { medidas_resguardo_en: '', dt_informada_en: '', decision_comunicada_en: '', investigacion_cerrada_en: '', informe_remitido_en: '', pronunciamiento_notificado_en: '', medidas_aplicadas_en: '' },
    medidas_resguardo: '', notificaciones: '', partes: [], entrevistas: [], antecedentes: [], control: {},
    informe: { hechos: '', declaraciones: '', alegaciones: '', razonamiento: '', conclusion: '', correctivas: '', sanciones: '' },
    inhabiles_extra: []
  };
}

/** Adapta el expediente al reloj de plazos de la Plataforma Karin (investigación interna por encargo del empleador). */
export function comoDenuncia(e: Expediente): Denuncia {
  const h = e.hitos, n = (f: Fecha | '') => f || null;
  return {
    recibida_en: `${e.denuncia.recibida}T12:00:00-04:00`, decision: 'investigacion_interna',
    medidas_resguardo_en: n(h.medidas_resguardo_en), dt_informada_en: n(h.dt_informada_en), decision_comunicada_en: n(h.decision_comunicada_en),
    investigacion_cerrada_en: n(h.investigacion_cerrada_en), informe_remitido_en: n(h.informe_remitido_en),
    pronunciamiento_notificado_en: n(h.pronunciamiento_notificado_en), medidas_aplicadas_en: n(h.medidas_aplicadas_en)
  };
}

/* Lista de control del debido proceso, tomada del DS N.º 21 de 2024 (reglamento de la Ley 21.643). */
export type ItemControl = { id: string; grupo: string; texto: string; base: string; condicional?: boolean };
export const LISTA_CONTROL: ItemControl[] = [
  { id: 'resguardo', grupo: 'Inicio', texto: 'El empleador adoptó medidas de resguardo y quedan registradas en el expediente', base: 'Código del Trabajo, art. 211-B bis; DS 21/2024, arts. 13 y 16 d)' },
  { id: 'apt', grupo: 'Inicio', texto: 'La persona denunciante fue derivada a la atención psicológica temprana del organismo administrador de la Ley 16.744', base: 'DS 21/2024, arts. 6 i) y 13' },
  { id: 'designacion', grupo: 'Inicio', texto: 'Se informó por escrito a la persona denunciante la designación de quien investiga', base: 'DS 21/2024, art. 14' },
  { id: 'formacion', grupo: 'Inicio', texto: 'Quien investiga cuenta con formación en acoso, género o derechos fundamentales', base: 'DS 21/2024, art. 14' },
  { id: 'correos', grupo: 'Inicio', texto: 'Todas las personas participantes informaron un correo electrónico personal para notificaciones, o pidieron otra forma por escrito', base: 'DS 21/2024, art. 4' },
  { id: 'analisis', grupo: 'Investigación', texto: 'Se analizó la denuncia; si era incoherente o incompleta, se dio un plazo razonable para completarla', base: 'DS 21/2024, art. 15' },
  { id: 'citacion', grupo: 'Investigación', texto: 'Se citó a declarar a todas las personas involucradas, con trato digno e imparcial', base: 'DS 21/2024, art. 7 c)' },
  { id: 'oidas', grupo: 'Investigación', texto: 'Todas las partes fueron oídas y pudieron fundamentar sus dichos y aportar antecedentes', base: 'DS 21/2024, arts. 2 h) y 15' },
  { id: 'firmas', grupo: 'Investigación', texto: 'Las declaraciones constan por escrito, en papel y con firma de quienes comparecen en todas sus hojas', base: 'DS 21/2024, art. 15' },
  { id: 'registro', grupo: 'Investigación', texto: 'Se lleva registro escrito de toda la investigación', base: 'DS 21/2024, art. 15' },
  { id: 'imparcialidad', grupo: 'Investigación', texto: 'Se registró si las partes plantearon antecedentes sobre la imparcialidad de quien investiga y qué decidió el empleador', base: 'DS 21/2024, arts. 14 y 16 c)' },
  { id: 'estado', grupo: 'Investigación', texto: 'Las partes fueron informadas del estado del procedimiento', base: 'DS 21/2024, art. 2 h)' },
  { id: 'doc_protocolo', grupo: 'Antecedentes que deben considerarse', texto: 'Protocolo de prevención del acoso sexual, laboral y de violencia en el trabajo', base: 'DS 21/2024, art. 15' },
  { id: 'doc_riohs', grupo: 'Antecedentes que deben considerarse', texto: 'Reglamento interno respectivo', base: 'DS 21/2024, art. 15' },
  { id: 'doc_contratos', grupo: 'Antecedentes que deben considerarse', texto: 'Contratos de trabajo y sus anexos', base: 'DS 21/2024, art. 15' },
  { id: 'doc_asistencia', grupo: 'Antecedentes que deben considerarse', texto: 'Registros de asistencia', base: 'DS 21/2024, art. 15' },
  { id: 'doc_diep', grupo: 'Antecedentes que deben considerarse', texto: 'Denuncia individual de enfermedades profesionales y accidentes del trabajo', base: 'DS 21/2024, art. 15' },
  { id: 'doc_vigilancia', grupo: 'Antecedentes que deben considerarse', texto: 'Protocolo de Vigilancia de Riesgos Psicosociales en el Trabajo', base: 'DS 21/2024, art. 15' },
  { id: 'doc_ceal', grupo: 'Antecedentes que deben considerarse', texto: 'Resultados del cuestionario CEAL-SM de la Superintendencia de Seguridad Social', base: 'DS 21/2024, art. 15' },
  { id: 'genero', grupo: 'Principios', texto: 'Se consideró la perspectiva de género durante todo el procedimiento', base: 'DS 21/2024, arts. 2 a) y 7 a)' },
  { id: 'no_discriminacion', grupo: 'Principios', texto: 'Se consideraron situaciones de vulnerabilidad o discriminaciones múltiples', base: 'DS 21/2024, art. 2 b)' },
  { id: 'revictimizacion', grupo: 'Principios', texto: 'Se adoptaron medidas para evitar la revictimización de la persona afectada en las diligencias', base: 'DS 21/2024, art. 2 c)' },
  { id: 'confidencialidad', grupo: 'Principios', texto: 'Se resguardó la confidencialidad de la información y el acceso al expediente', base: 'DS 21/2024, arts. 2 d) y 7 d)' },
  { id: 'delito', grupo: 'Situaciones especiales', texto: 'Si los hechos pueden ser delito, se informó a la persona denunciante de los canales del Ministerio Público, Carabineros y la PDI', base: 'DS 21/2024, art. 6 g)', condicional: true },
  { id: 'contratistas', grupo: 'Situaciones especiales', texto: 'Si participan trabajadores de contratistas, servicios transitorios o proveedores, se informó a sus empleadores', base: 'DS 21/2024, arts. 6 l) y 24', condicional: true },
  { id: 'informe', grupo: 'Cierre', texto: 'El informe contiene todo lo que exige el reglamento (letras a a i)', base: 'DS 21/2024, art. 16' },
  { id: 'plazo', grupo: 'Cierre', texto: 'La investigación concluyó dentro de 30 días hábiles desde la presentación de la denuncia', base: 'DS 21/2024, art. 17' },
  { id: 'remision', grupo: 'Cierre', texto: 'El empleador remitió el informe a la Dirección del Trabajo dentro de 2 días hábiles', base: 'DS 21/2024, art. 18' }
];

export function avanceControl(e: Expediente): { hechos: number; total: number } {
  const total = LISTA_CONTROL.filter(i => !i.condicional || e.control[i.id]?.hecho).length;
  const hechos = LISTA_CONTROL.filter(i => e.control[i.id]?.hecho).length;
  return { hechos, total };
}
