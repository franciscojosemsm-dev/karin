/* Reloj de plazos de una denuncia, según el reglamento de la Ley 21.643 (DS N.º 21 de 2024, Ministerio del Trabajo):
   - Art. 1: salvo que se diga otra cosa, los plazos son de días hábiles; son inhábiles los sábados, domingos y festivos.
   - Art. 12: dentro de 3 días desde la recepción, informar a la DT el inicio de la investigación y las medidas de
     resguardo, o derivarle la denuncia (siempre se deriva si la denuncia es contra quienes señala el art. 4, inc. 1,
     del Código del Trabajo, o si quien denuncia lo pide). La decisión se informa por escrito a quien denuncia.
   - Art. 13 y Código del Trabajo, art. 211-B bis: medidas de resguardo inmediatas.
   - Art. 17: la investigación concluye en 30 días desde la presentación de la denuncia.
   - Art. 18: el informe se remite a la DT dentro de 2 días de finalizada la investigación; la DT tiene 30 días.
   - Art. 19: medidas o sanciones dentro de 15 días corridos desde la notificación del pronunciamiento, o desde que
     transcurren 30 días desde la remisión sin pronunciamiento.
   Los días se cuentan desde el día siguiente al hecho que inicia el plazo. */
import { type Fecha, sumarDias, diaSemana, fechaEnChile } from './fechas';
import { feriado } from './feriados';

export function esHabil(f: Fecha, extra: readonly Fecha[] = []): boolean {
  const d = diaSemana(f);
  return d !== 0 && d !== 6 && !feriado(f) && !extra.includes(f);
}

export function sumarHabiles(desde: Fecha, n: number, extra: readonly Fecha[] = []): Fecha {
  let f = desde, cuenta = 0;
  while (cuenta < n) { f = sumarDias(f, 1); if (esHabil(f, extra)) cuenta++; }
  return f;
}

export function habilesEntre(desde: Fecha, hasta: Fecha, extra: readonly Fecha[] = []): number {
  if (hasta <= desde) return 0;
  let f = desde, cuenta = 0;
  while (f < hasta) { f = sumarDias(f, 1); if (esHabil(f, extra)) cuenta++; }
  return cuenta;
}

export type Denuncia = {
  recibida_en: string;
  solicita_derivacion?: boolean | null;
  contra_representante?: boolean | null;
  decision?: 'investigacion_interna' | 'derivada_dt' | null;
  medidas_resguardo_en?: Fecha | null;
  dt_informada_en?: Fecha | null;
  decision_comunicada_en?: Fecha | null;
  investigacion_cerrada_en?: Fecha | null;
  informe_remitido_en?: Fecha | null;
  pronunciamiento_notificado_en?: Fecha | null;
  medidas_aplicadas_en?: Fecha | null;
};

export type EstadoHito = 'cumplido' | 'cumplido_tarde' | 'vencido' | 'hoy' | 'proximo' | 'pendiente' | 'informativo';

export type Hito = {
  clave: string;
  titulo: string;
  base: string;
  vence: Fecha | null;
  /** El vencimiento depende de un hito anterior que aún no ocurre: es la fecha más tardía posible. */
  estimado: boolean;
  cumplido: Fecha | null;
  /** Plazo que corre para la Dirección del Trabajo, no para la empresa. */
  informativo?: boolean;
  nota?: string;
  estado: EstadoHito;
};

function estado(h: Omit<Hito, 'estado'>, hoy: Fecha, extra: readonly Fecha[]): EstadoHito {
  if (h.cumplido) return h.vence && h.cumplido > h.vence ? 'cumplido_tarde' : 'cumplido';
  if (h.informativo) return 'informativo';
  if (!h.vence) return 'pendiente';
  if (hoy > h.vence) return 'vencido';
  if (hoy === h.vence) return 'hoy';
  return habilesEntre(hoy, h.vence, extra) <= 2 ? 'proximo' : 'pendiente';
}

/** Debe derivarse a la Dirección del Trabajo (DS 21/2024, art. 12). */
export const derivacionObligatoria = (d: Denuncia) => !!(d.solicita_derivacion || d.contra_representante);

export function calcularHitos(d: Denuncia, hoy: Fecha, extra: readonly Fecha[] = []): Hito[] {
  const recepcion = fechaEnChile(d.recibida_en);
  const hitos: Omit<Hito, 'estado'>[] = [];
  const obligatoria = derivacionObligatoria(d);
  const derivada = d.decision === 'derivada_dt' || (obligatoria && d.decision !== 'investigacion_interna');

  hitos.push({
    clave: 'resguardo', titulo: 'Adoptar medidas de resguardo', base: 'Código del Trabajo, art. 211-B bis; DS 21/2024, art. 13',
    vence: recepcion, estimado: false, cumplido: d.medidas_resguardo_en ?? null,
    nota: 'De inmediato. Entre ellas, la atención psicológica temprana de la persona denunciante a través del organismo administrador de la Ley 16.744.'
  });
  hitos.push({
    clave: 'decision',
    titulo: derivada ? 'Derivar la denuncia y sus antecedentes a la Dirección del Trabajo' : 'Informar a la Dirección del Trabajo el inicio de la investigación y las medidas de resguardo, o derivarle la denuncia',
    base: 'DS 21/2024, art. 12', vence: sumarHabiles(recepcion, 3, extra), estimado: false, cumplido: d.dt_informada_en ?? null,
    nota: obligatoria
      ? (d.contra_representante ? 'La denuncia se dirige contra una persona del art. 4, inc. 1, del Código del Trabajo: debe derivarse a la Dirección del Trabajo.' : 'La persona denunciante pidió que se derive a la Dirección del Trabajo.')
      : undefined
  });
  hitos.push({
    clave: 'comunicar', titulo: 'Informar por escrito a la persona denunciante la decisión adoptada', base: 'DS 21/2024, art. 12',
    vence: null, estimado: false, cumplido: d.decision_comunicada_en ?? null, nota: 'El reglamento no fija un plazo; conviene hacerlo junto con la decisión.'
  });

  if (derivada) {
    const base = d.dt_informada_en ?? sumarHabiles(recepcion, 3, extra);
    hitos.push({
      clave: 'investigacion_dt', titulo: 'Plazo de la Dirección del Trabajo para investigar', base: 'DS 21/2024, art. 17',
      vence: sumarHabiles(base, 30, extra), estimado: !d.dt_informada_en, cumplido: null, informativo: true,
      nota: 'Se cuenta desde que la Dirección del Trabajo recibe la derivación, según el certificado de recepción que emite.'
    });
    hitos.push({
      clave: 'medidas', titulo: 'Aplicar las medidas o sanciones que correspondan e informar a ambas partes', base: 'DS 21/2024, art. 20',
      vence: null, estimado: false, cumplido: d.medidas_aplicadas_en ?? null,
      nota: 'Una vez notificada del resultado de la investigación de la Dirección del Trabajo.'
    });
  } else {
    const venceInvestigacion = sumarHabiles(recepcion, 30, extra);
    hitos.push({
      clave: 'investigacion', titulo: 'Concluir la investigación', base: 'DS 21/2024, art. 17',
      vence: venceInvestigacion, estimado: false, cumplido: d.investigacion_cerrada_en ?? null
    });
    const cierre = d.investigacion_cerrada_en ?? venceInvestigacion;
    const venceRemision = sumarHabiles(cierre, 2, extra);
    hitos.push({
      clave: 'remision', titulo: 'Remitir el informe y sus conclusiones a la Dirección del Trabajo', base: 'DS 21/2024, art. 18',
      vence: venceRemision, estimado: !d.investigacion_cerrada_en, cumplido: d.informe_remitido_en ?? null,
      nota: 'De manera electrónica, dentro de 2 días hábiles desde el cierre.'
    });
    const remision = d.informe_remitido_en ?? venceRemision;
    const vencePronunciamiento = sumarHabiles(remision, 30, extra);
    hitos.push({
      clave: 'pronunciamiento', titulo: 'Plazo de la Dirección del Trabajo para pronunciarse', base: 'DS 21/2024, art. 18',
      vence: vencePronunciamiento, estimado: !d.informe_remitido_en, cumplido: d.pronunciamiento_notificado_en ?? null, informativo: true,
      nota: 'Si no se pronuncia, se consideran válidas las conclusiones del informe, que la empresa debe notificar a las partes.'
    });
    hitos.push({
      clave: 'medidas', titulo: 'Aplicar las medidas o sanciones e informar a ambas partes', base: 'DS 21/2024, art. 19',
      vence: sumarDias(d.pronunciamiento_notificado_en ?? vencePronunciamiento, 15),
      estimado: !d.pronunciamiento_notificado_en && !d.informe_remitido_en, cumplido: d.medidas_aplicadas_en ?? null,
      nota: '15 días corridos desde la notificación del pronunciamiento o, si no lo hubo, desde que vencen los 30 días de la Dirección del Trabajo.'
    });
  }
  return hitos.map(h => ({ ...h, estado: estado(h, hoy, extra) }));
}

/** El próximo vencimiento pendiente para la empresa (para listas y avisos). */
export function proximoHito(hitos: Hito[]): Hito | undefined {
  return hitos.filter(h => !h.cumplido && !h.informativo && h.vence).sort((a, b) => a.vence!.localeCompare(b.vence!))[0];
}
