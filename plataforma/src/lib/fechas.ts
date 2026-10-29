/* Fechas civiles como texto «AAAA-MM-DD». Los cálculos se hacen a mediodía UTC para no tropezar con cambios de horario. */
export type Fecha = string;

const ZONA = 'America/Santiago';

export const aDate = (f: Fecha) => new Date(`${f}T12:00:00Z`);
export const deDate = (d: Date): Fecha => d.toISOString().slice(0, 10);
export const sumarDias = (f: Fecha, n: number): Fecha => { const d = aDate(f); d.setUTCDate(d.getUTCDate() + n); return deDate(d); };
export const diaSemana = (f: Fecha) => aDate(f).getUTCDay(); // 0 domingo … 6 sábado
export const fecha = (anio: number, mes: number, dia: number): Fecha =>
  `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

/** Fecha civil en Chile de un instante (por ejemplo, la hora de recepción de una denuncia). */
export function fechaEnChile(instante: Date | string): Fecha {
  const d = typeof instante === 'string' ? new Date(instante) : instante;
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const v = (t: string) => p.find(x => x.type === t)!.value;
  return `${v('year')}-${v('month')}-${v('day')}`;
}

export const hoyEnChile = () => fechaEnChile(new Date());

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function fechaLarga(f: Fecha | null | undefined, conDia = true): string {
  if (!f) return '—';
  const d = aDate(f);
  const base = `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
  return conDia ? `${DIAS[d.getUTCDay()]} ${base}` : base;
}

export function horaChile(instante: string): string {
  return new Intl.DateTimeFormat('es-CL', { timeZone: ZONA, dateStyle: 'long', timeStyle: 'short' }).format(new Date(instante));
}
