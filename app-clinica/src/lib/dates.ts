export const TZ = process.env.APP_TIMEZONE || "America/Santiago";

type Parts = { y: number; m: number; d: number; h: number; mi: number; s: number };

function partsIn(ts: number, tz = TZ): Parts {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(new Date(ts))) if (p.type !== "literal") o[p.type] = Number(p.value);
  return { y: o.year, m: o.month, d: o.day, h: o.hour, mi: o.minute, s: o.second };
}

/** Desfase (ms) de la zona respecto a UTC en el instante ts. */
function offsetMs(ts: number, tz = TZ): number {
  const p = partsIn(ts, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ts / 1000) * 1000;
}

/** Instante UTC correspondiente a las 00:00 locales del día de `date`. */
export function startOfDay(date: Date, tz = TZ): Date {
  const p = partsIn(date.getTime(), tz);
  const guess = Date.UTC(p.y, p.m - 1, p.d);
  let ts = guess - offsetMs(guess, tz);
  ts = guess - offsetMs(ts, tz);
  return new Date(ts);
}

export function addDays(date: Date, days: number): Date {
  return startOfDayAdd(date, days);
}
function startOfDayAdd(date: Date, days: number): Date {
  // Suma días de calendario locales conservando la hora local.
  const p = partsIn(date.getTime());
  const guess = Date.UTC(p.y, p.m - 1, p.d + days, p.h, p.mi, p.s);
  let ts = guess - offsetMs(guess);
  ts = guess - offsetMs(ts);
  return new Date(ts);
}

/** Lunes 00:00 local de la semana de `date`. */
export function startOfWeek(date: Date): Date {
  const sod = startOfDay(date);
  const p = partsIn(sod.getTime() + 12 * 3600_000); // mediodía evita bordes de DST
  const dow = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(); // 0 = domingo
  return addDays(sod, -((dow + 6) % 7));
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

export const fmtTime = (d: string | Date) =>
  new Intl.DateTimeFormat("es-CL", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(d));

export const fmtDate = (d: string | Date) =>
  new Intl.DateTimeFormat("es-CL", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(d));

export const fmtDateLong = (d: string | Date) =>
  new Intl.DateTimeFormat("es-CL", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(new Date(d));

/** Convierte un `datetime-local` ("2026-10-14T16:00") interpretado en TZ a instante UTC ISO. */
export function localInputToISO(value: string): string {
  const [date, time = "00:00"] = value.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let ts = guess - offsetMs(guess);
  ts = guess - offsetMs(ts);
  return new Date(ts).toISOString();
}

export function ageFrom(birth: string | null): number | null {
  if (!birth) return null;
  const now = partsIn(Date.now());
  const [y, m, d] = birth.split("-").map(Number);
  let age = now.y - y;
  if (now.m < m || (now.m === m && now.d < d)) age--;
  return age;
}

/** Días hasta el próximo cumpleaños (0 = hoy). */
export function daysToBirthday(birth: string | null): number | null {
  if (!birth) return null;
  const now = partsIn(Date.now());
  const [, m, d] = birth.split("-").map(Number);
  const today = Date.UTC(now.y, now.m - 1, now.d);
  let next = Date.UTC(now.y, m - 1, d);
  if (next < today) next = Date.UTC(now.y + 1, m - 1, d);
  return Math.round((next - today) / 86_400_000);
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).map((w) => w[0]!.toUpperCase()).slice(0, 3).join(".") + ".";
