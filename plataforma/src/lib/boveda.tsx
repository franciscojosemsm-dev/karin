import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { useSesion } from './sesion';
import { type BovedaGuardada, crearBoveda, abrirConClave, abrirConRecuperacion, reenvolverConClave } from './cripto';

type Estado = 'cargando' | 'sin' | 'cerrada' | 'abierta';
type Ctx = {
  estado: Estado; marca: string; dek: CryptoKey | null;
  crear: (marca: string, clave: string, codigo: string) => Promise<void>;
  abrir: (clave: string) => Promise<boolean>;
  recuperar: (codigo: string, nuevaClave: string) => Promise<boolean>;
  cambiarMarca: (marca: string) => Promise<void>;
  cerrar: () => void;
};
const C = createContext<Ctx | null>(null);
const INACTIVIDAD = 30 * 60 * 1000; // se cierra sola tras 30 minutos sin uso

export function ProveedorBoveda({ children }: { children: ReactNode }) {
  const { sesion } = useSesion();
  const [estado, setEstado] = useState<Estado>('cargando');
  const [fila, setFila] = useState<(BovedaGuardada & { marca: string }) | null>(null);
  const [dek, setDek] = useState<CryptoKey | null>(null);
  const reloj = useRef<number>();

  useEffect(() => {
    setDek(null);
    if (!sesion) { setEstado('cargando'); return; }
    supabase.from('bovedas').select('*').maybeSingle().then(({ data }) => { setFila(data); setEstado(data ? 'cerrada' : 'sin'); });
  }, [sesion]);

  const cerrar = useCallback(() => { setDek(null); setEstado(e => (e === 'abierta' ? 'cerrada' : e)); }, []);
  useEffect(() => {
    if (!dek) return;
    const reiniciar = () => { clearTimeout(reloj.current); reloj.current = window.setTimeout(cerrar, INACTIVIDAD); };
    reiniciar();
    const ev = ['pointerdown', 'keydown'];
    ev.forEach(x => addEventListener(x, reiniciar));
    return () => { clearTimeout(reloj.current); ev.forEach(x => removeEventListener(x, reiniciar)); };
  }, [dek, cerrar]);

  const valor: Ctx = {
    estado, marca: fila?.marca ?? '', dek,
    async crear(marca, clave, codigo) {
      const { guardada, dek } = await crearBoveda(clave, codigo);
      const { data, error } = await supabase.from('bovedas').insert({ user_id: sesion!.user.id, marca, ...guardada }).select().single();
      if (error) throw error;
      setFila(data); setDek(dek); setEstado('abierta');
    },
    async abrir(clave) {
      try { setDek(await abrirConClave(fila!, clave)); setEstado('abierta'); return true; } catch { return false; }
    },
    async recuperar(codigo, nuevaClave) {
      try {
        const k = await abrirConRecuperacion(fila!, codigo);
        const nueva = await reenvolverConClave(fila!, codigo, nuevaClave);
        const { data, error } = await supabase.from('bovedas').update({ sal: nueva.sal, iv: nueva.iv, dek_c: nueva.dek_c }).eq('user_id', sesion!.user.id).select().single();
        if (error) return false;
        setFila(data); setDek(k); setEstado('abierta'); return true;
      } catch { return false; }
    },
    async cambiarMarca(marca) {
      const { data, error } = await supabase.from('bovedas').update({ marca }).eq('user_id', sesion!.user.id).select().single();
      if (error) throw error;
      setFila(data);
    },
    cerrar
  };
  return <C.Provider value={valor}>{children}</C.Provider>;
}

export const useBoveda = () => useContext(C)!;
