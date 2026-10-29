import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, mensajeError } from '../lib/supabase';

/* Destino del enlace de recuperación de contraseña. */
export default function NuevaClave() {
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navegar = useNavigate();
  async function enviar(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: clave });
    if (error) return setError(mensajeError(error));
    navegar('/panel');
  }
  return (
    <main className="mx-auto max-w-[440px] px-4 py-14">
      <form onSubmit={enviar} className="tarjeta space-y-4 p-7">
        <h1 className="titulo text-[1.6rem]">Nueva contraseña</h1>
        <label className="block"><span className="etiqueta">Contraseña</span><input className="campo" type="password" minLength={8} autoComplete="new-password" required value={clave} onChange={e => setClave(e.target.value)} /></label>
        {error && <p role="alert" className="rounded-xl bg-rosa px-4 py-3 text-[0.9rem] text-riesgo">{error}</p>}
        <button className="boton w-full">Guardar</button>
      </form>
    </main>
  );
}
