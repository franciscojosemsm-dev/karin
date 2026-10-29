import type { Fecha } from './fechas';

export type Empresa = { id: string; nombre: string; rut: string | null; correo_contacto: string | null; slug: string; inhabiles_extra: Fecha[] };

export type Denuncia = {
  id: string; empresa_id: string; folio: number; recibida_en: string; via: string; tipos: string[];
  denunciados: { nombre?: string; cargo?: string }[]; vinculo: string | null; hechos: string; testigos: string | null;
  solicita_derivacion: boolean; contra_representante: boolean; codigo: string; estado: string;
  medidas_resguardo: string | null; medidas_resguardo_en: Fecha | null; decision: 'investigacion_interna' | 'derivada_dt' | null;
  dt_informada_en: Fecha | null; decision_comunicada_en: Fecha | null; investigador: string | null;
  investigacion_cerrada_en: Fecha | null; informe_remitido_en: Fecha | null; pronunciamiento_notificado_en: Fecha | null;
  medidas_aplicadas_en: Fecha | null; notas: string | null;
};

export type Identidad = {
  afectado_nombre: string; afectado_rut: string; afectado_correo: string; afectado_telefono: string | null; afectado_cargo: string | null;
  denunciante_distinto: boolean; denunciante_nombre: string | null; denunciante_rut: string | null; denunciante_correo: string | null; representacion: string | null;
};

export const TIPOS: Record<string, string> = {
  acoso_laboral: 'Acoso laboral',
  acoso_sexual: 'Acoso sexual',
  violencia_trabajo: 'Violencia en el trabajo ejercida por terceros'
};

export const ESTADOS: Record<string, string> = {
  recibida: 'Recibida',
  en_investigacion: 'En investigación',
  derivada_dt: 'Derivada a la Dirección del Trabajo',
  informe_remitido: 'Informe remitido a la Dirección del Trabajo',
  pronunciamiento: 'Con pronunciamiento de la Dirección del Trabajo',
  cerrada: 'Cerrada'
};

export const VIAS: Record<string, string> = { canal: 'Canal en línea', verbal: 'Verbal (con acta)', escrita: 'Por escrito', correo: 'Por correo electrónico', otra: 'Otra vía' };
