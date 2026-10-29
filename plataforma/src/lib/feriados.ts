/* Feriados nacionales de Chile calculados a partir de las reglas legales, para no depender de listas que cambian.
   - Fechas fijas y móviles de la Ley 2.977 y sus modificaciones.
   - Traslado al lunes de San Pedro y San Pablo y del Encuentro de Dos Mundos (Ley 19.668).
   - Día Nacional de los Pueblos Indígenas: el día del solsticio de invierno (Ley 21.357), calculado en hora de Chile.
   No incluye feriados regionales ni los que se declaran para elecciones: cada empresa los agrega en sus ajustes. */
import { type Fecha, fecha, diaSemana, sumarDias, fechaEnChile } from './fechas';

/** Domingo de Pascua (algoritmo gregoriano anónimo). */
export function pascua(anio: number): Fecha {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return fecha(anio, mes, dia);
}

/* Solsticio de junio según J. Meeus, «Astronomical Algorithms», cap. 27 (precisión de minutos). */
const TERMINOS: [number, number, number][] = [
  [485, 324.96, 1934.136], [203, 337.23, 32964.467], [199, 342.08, 20.186], [182, 27.85, 445267.112],
  [156, 73.14, 45036.886], [136, 171.52, 22518.443], [77, 222.54, 65928.934], [74, 296.72, 3034.906],
  [70, 243.58, 9037.513], [58, 119.81, 33718.147], [52, 297.17, 150.678], [50, 21.02, 2281.226],
  [45, 247.54, 29929.562], [44, 325.15, 31555.956], [29, 60.93, 4443.417], [18, 155.12, 67555.328],
  [17, 288.79, 4562.452], [16, 198.04, 62894.029], [14, 199.76, 31436.921], [12, 95.39, 14577.848],
  [12, 287.11, 31931.756], [12, 320.81, 34777.259], [9, 227.73, 1222.114], [8, 15.45, 16859.074]
];
const rad = (g: number) => (g * Math.PI) / 180;

export function solsticioJunio(anio: number): Date {
  const Y = (anio - 2000) / 1000;
  const jde0 = 2451716.56767 + 365241.62603 * Y + 0.00325 * Y ** 2 + 0.00888 * Y ** 3 - 0.0003 * Y ** 4;
  const T = (jde0 - 2451545.0) / 36525;
  const W = 35999.373 * T - 2.47;
  const dl = 1 + 0.0334 * Math.cos(rad(W)) + 0.0007 * Math.cos(rad(2 * W));
  const S = TERMINOS.reduce((s, [A, B, C]) => s + A * Math.cos(rad(B + C * T)), 0);
  const jde = jde0 + (0.00001 * S) / dl;
  const deltaT = 69 / 86400; // diferencia aproximada entre tiempo terrestre y UTC
  return new Date((jde - deltaT - 2440587.5) * 86400000);
}

/** Traslado de la Ley 19.668: martes a jueves, al lunes de esa semana; viernes, al lunes siguiente. */
function trasladable(f: Fecha): Fecha {
  const d = diaSemana(f);
  if (d >= 2 && d <= 4) return sumarDias(f, -(d - 1));
  if (d === 5) return sumarDias(f, 3);
  return f;
}

const cache = new Map<number, Map<Fecha, string>>();

export function feriadosDelAnio(anio: number): Map<Fecha, string> {
  const enCache = cache.get(anio);
  if (enCache) return enCache;
  const m = new Map<Fecha, string>();
  const add = (f: Fecha, nombre: string) => m.set(f, m.has(f) ? `${m.get(f)} · ${nombre}` : nombre);

  add(fecha(anio, 1, 1), 'Año Nuevo');
  if (diaSemana(fecha(anio, 1, 2)) === 1) add(fecha(anio, 1, 2), 'Feriado adicional de Año Nuevo');
  const p = pascua(anio);
  add(sumarDias(p, -2), 'Viernes Santo');
  add(sumarDias(p, -1), 'Sábado Santo');
  add(fecha(anio, 5, 1), 'Día Nacional del Trabajo');
  add(fecha(anio, 5, 21), 'Día de las Glorias Navales');
  add(fechaEnChile(solsticioJunio(anio)), 'Día Nacional de los Pueblos Indígenas');
  add(trasladable(fecha(anio, 6, 29)), 'San Pedro y San Pablo');
  add(fecha(anio, 7, 16), 'Día de la Virgen del Carmen');
  add(fecha(anio, 8, 15), 'Asunción de la Virgen');
  if (diaSemana(fecha(anio, 9, 17)) === 1) add(fecha(anio, 9, 17), 'Feriado adicional de Fiestas Patrias');
  add(fecha(anio, 9, 18), 'Independencia Nacional');
  add(fecha(anio, 9, 19), 'Día de las Glorias del Ejército');
  if (diaSemana(fecha(anio, 9, 20)) === 5) add(fecha(anio, 9, 20), 'Feriado adicional de Fiestas Patrias');
  add(trasladable(fecha(anio, 10, 12)), 'Encuentro de Dos Mundos');
  const evangelicas = fecha(anio, 10, 31), de = diaSemana(evangelicas);
  add(de === 2 ? sumarDias(evangelicas, -4) : de === 3 ? sumarDias(evangelicas, 2) : evangelicas, 'Día de las Iglesias Evangélicas y Protestantes');
  add(fecha(anio, 11, 1), 'Día de Todos los Santos');
  add(fecha(anio, 12, 8), 'Inmaculada Concepción');
  add(fecha(anio, 12, 25), 'Navidad');

  cache.set(anio, m);
  return m;
}

export function feriado(f: Fecha): string | undefined {
  return feriadosDelAnio(Number(f.slice(0, 4))).get(f);
}
