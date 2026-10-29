/* Cifrado de expedientes en el navegador (Web Crypto).
   - Una clave de datos aleatoria (AES-GCM de 256 bits) cifra cada expediente con un IV nuevo en cada guardado.
   - Esa clave se guarda envuelta dos veces: con la clave del investigador y con su código de recuperación,
     ambas derivadas con PBKDF2-SHA-256 (600.000 iteraciones). El servidor nunca ve las claves ni el contenido. */

export const ITERACIONES = 600_000;
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
const deB64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const azar = (n: number) => crypto.getRandomValues(new Uint8Array(n));

export type BovedaGuardada = {
  iteraciones: number; sal: string; iv: string; dek_c: string; sal_rec: string; iv_rec: string; dek_rec_c: string;
};

/** Código de recuperación de 24 caracteres (120 bits), en grupos de 4. */
export function nuevoCodigoRecuperacion(): string {
  const b = azar(24);
  return Array.from(b, x => ALFABETO[x % 32]).join('').match(/.{4}/g)!.join('-');
}
export const normalizarCodigo = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');

async function derivar(secreto: string, sal: Uint8Array, iteraciones: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteraciones }, base,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function envolver(dekCruda: Uint8Array, secreto: string, iteraciones: number) {
  const sal = azar(16), iv = azar(12);
  const k = await derivar(secreto, sal, iteraciones);
  const c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, dekCruda);
  return { sal: b64(sal), iv: b64(iv), c: b64(c) };
}

async function desenvolver(c: string, iv: string, sal: string, secreto: string, iteraciones: number): Promise<CryptoKey> {
  const k = await derivar(secreto, deB64(sal), iteraciones);
  const cruda = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(iv) }, k, deB64(c)); // falla si el secreto no es el correcto
  return crypto.subtle.importKey('raw', cruda, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** Crea la bóveda: devuelve lo que se guarda en el servidor y la clave de datos ya abierta. */
export async function crearBoveda(clave: string, codigoRecuperacion: string, iteraciones = ITERACIONES) {
  const cruda = azar(32);
  const p = await envolver(cruda, clave, iteraciones);
  const r = await envolver(cruda, normalizarCodigo(codigoRecuperacion), iteraciones);
  const dek = await crypto.subtle.importKey('raw', cruda, 'AES-GCM', false, ['encrypt', 'decrypt']);
  cruda.fill(0);
  const guardada: BovedaGuardada = { iteraciones, sal: p.sal, iv: p.iv, dek_c: p.c, sal_rec: r.sal, iv_rec: r.iv, dek_rec_c: r.c };
  return { guardada, dek };
}

export const abrirConClave = (b: BovedaGuardada, clave: string) => desenvolver(b.dek_c, b.iv, b.sal, clave, b.iteraciones);
export const abrirConRecuperacion = (b: BovedaGuardada, codigo: string) => desenvolver(b.dek_rec_c, b.iv_rec, b.sal_rec, normalizarCodigo(codigo), b.iteraciones);

/** Cambia la clave del investigador (por ejemplo, tras usar el código de recuperación) sin recifrar los expedientes. */
export async function reenvolverConClave(b: BovedaGuardada, codigo: string, nuevaClave: string): Promise<BovedaGuardada> {
  const k = await derivar(normalizarCodigo(codigo), deB64(b.sal_rec), b.iteraciones);
  const cruda = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(b.iv_rec) }, k, deB64(b.dek_rec_c)));
  const p = await envolver(cruda, nuevaClave, b.iteraciones);
  cruda.fill(0);
  return { ...b, sal: p.sal, iv: p.iv, dek_c: p.c };
}

export async function cifrar(dek: CryptoKey, valor: unknown): Promise<{ iv: string; datos: string }> {
  const iv = azar(12);
  const c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, new TextEncoder().encode(JSON.stringify(valor)));
  // Base64 por bloques para no exceder la pila con expedientes grandes
  const bytes = new Uint8Array(c); let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { iv: b64(iv), datos: btoa(s) };
}

export async function descifrar<T>(dek: CryptoKey, iv: string, datos: string): Promise<T> {
  const p = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(iv) }, dek, deB64(datos));
  return JSON.parse(new TextDecoder().decode(p)) as T;
}
