import { supabase } from './supabase';
import { cifrar, descifrar } from './cripto';
import type { Expediente } from './expediente';

export type Fila = { id: string; iv: string; datos: string; version: number; creado_en: string; actualizado_en: string };
export type Abierto = { id: string; version: number; actualizado_en: string; e: Expediente };

export async function listar(dek: CryptoKey): Promise<{ abiertos: Abierto[]; ilegibles: number }> {
  const { data, error } = await supabase.from('expedientes').select('*').order('actualizado_en', { ascending: false });
  if (error) throw error;
  const abiertos: Abierto[] = []; let ilegibles = 0;
  for (const f of (data as Fila[]) ?? []) {
    try { abiertos.push({ id: f.id, version: f.version, actualizado_en: f.actualizado_en, e: await descifrar<Expediente>(dek, f.iv, f.datos) }); }
    catch { ilegibles++; }
  }
  return { abiertos, ilegibles };
}

export async function cargar(dek: CryptoKey, id: string): Promise<Abierto | null> {
  const { data } = await supabase.from('expedientes').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  const f = data as Fila;
  return { id: f.id, version: f.version, actualizado_en: f.actualizado_en, e: await descifrar<Expediente>(dek, f.iv, f.datos) };
}

export async function crear(dek: CryptoKey, e: Expediente): Promise<string> {
  const { data, error } = await supabase.from('expedientes').insert(await cifrar(dek, e)).select('id').single();
  if (error) throw error;
  return data.id;
}

/** Guarda solo si nadie lo cambió desde que se abrió (otra pestaña u otro equipo). Devuelve la versión nueva o null si hubo conflicto. */
export async function guardar(dek: CryptoKey, a: Abierto): Promise<Abierto | null> {
  const { data, error } = await supabase.from('expedientes').update(await cifrar(dek, a.e)).eq('id', a.id).eq('version', a.version).select('version, actualizado_en');
  if (error) throw error;
  if (!data?.length) return null;
  return { ...a, version: data[0].version, actualizado_en: data[0].actualizado_en };
}

export async function borrar(id: string) {
  const { error } = await supabase.from('expedientes').delete().eq('id', id);
  if (error) throw error;
}
