/** Valida un RUT chileno (dígito verificador, módulo 11). Acepta puntos y guion. */
export function rutValido(rut: string): boolean {
  const limpio = rut.replace(/[.\s]/g, '').toUpperCase();
  const m = /^(\d{1,8})-?([\dK])$/.exec(limpio);
  if (!m) return false;
  let suma = 0, factor = 2;
  for (let i = m[1].length - 1; i >= 0; i--) { suma += Number(m[1][i]) * factor; factor = factor === 7 ? 2 : factor + 1; }
  const dv = 11 - (suma % 11);
  return m[2] === (dv === 11 ? '0' : dv === 10 ? 'K' : String(dv));
}

export const correoValido = (c: string) => /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(c.trim());
