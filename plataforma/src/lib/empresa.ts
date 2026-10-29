import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Empresa } from './tipos';

const CLAVE = 'karin.empresa';

/** Empresas de la cuenta y la seleccionada (se recuerda en este navegador). */
export function useEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null);
  const [id, setId] = useState<string | null>(() => { try { return localStorage.getItem(CLAVE); } catch { return null; } });
  const recargar = useCallback(async () => {
    const { data } = await supabase.from('empresas').select('id, nombre, rut, correo_contacto, slug, inhabiles_extra').order('creada_en');
    setEmpresas(data ?? []);
  }, []);
  useEffect(() => { recargar(); }, [recargar]);
  const elegir = (nuevo: string) => { setId(nuevo); try { localStorage.setItem(CLAVE, nuevo); } catch { /* sin almacenamiento */ } };
  const actual = empresas?.find(e => e.id === id) ?? empresas?.[0] ?? null;
  return { empresas, actual, elegir, recargar };
}

export const urlCanal = (slug: string) => `${location.origin}/d/${slug}`;
