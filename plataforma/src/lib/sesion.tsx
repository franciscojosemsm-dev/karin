import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

const Ctx = createContext<{ sesion: Session | null; cargando: boolean }>({ sesion: null, cargando: true });

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSesion(data.session); setCargando(false); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return <Ctx.Provider value={{ sesion, cargando }}>{children}</Ctx.Provider>;
}

export const useSesion = () => useContext(Ctx);
