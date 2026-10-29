import { createClient } from '@supabase/supabase-js';

// Datos públicos del proyecto: la clave publicable solo permite lo que autorizan las reglas por fila de la base.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://lzcczwkaoouvuzlknxoh.supabase.co';
const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_ZRhmuntuxTJijUt7CNqmQQ_KN0CcGek';

export const supabase = createClient(url, clave, { auth: { persistSession: true, autoRefreshToken: true } });

/** Mensaje claro para errores de la base o de la red. */
export function mensajeError(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e);
  if (/Failed to fetch|NetworkError/i.test(m)) return 'No hay conexión con el servidor. Revise su conexión e inténtelo de nuevo.';
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(m)) return 'Debe confirmar su correo antes de ingresar. Revise su bandeja de entrada.';
  if (/User already registered/i.test(m)) return 'Ya existe una cuenta con ese correo. Ingrese con su contraseña.';
  if (/Password should be/i.test(m)) return 'La contraseña debe tener al menos 8 caracteres.';
  if (/violates check constraint/i.test(m)) return 'Revise los datos: algún campo está vacío o es demasiado largo.';
  if (/rate limit/i.test(m)) return 'Demasiados intentos seguidos. Espere unos minutos.';
  // Mensajes propios de las funciones de la base (ya están en castellano)
  if (/^[A-ZÁÉÍÓÚÑ][^\n]{5,200}\.$/.test(m)) return m;
  return 'No se pudo completar la operación. Inténtelo de nuevo.';
}
