import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase, mensajeError } from '../lib/supabase';
import { useSesion } from '../lib/sesion';

export default function Ingresar() {
  const { sesion } = useSesion();
  const [modo, setModo] = useState<'ingresar' | 'registro' | 'olvido'>('ingresar');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  if (sesion) return <Navigate to="/panel" replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true); setError(null); setAviso(null);
    const volver = `${location.origin}/panel`;
    const r = modo === 'ingresar' ? await supabase.auth.signInWithPassword({ email: correo, password: clave })
      : modo === 'registro' ? await supabase.auth.signUp({ email: correo, password: clave, options: { emailRedirectTo: volver } })
      : await supabase.auth.resetPasswordForEmail(correo, { redirectTo: `${location.origin}/clave` });
    setOcupado(false);
    if (r.error) return setError(mensajeError(r.error));
    if (modo === 'registro' && !(r.data as { session?: unknown } | null)?.session) setAviso('Le enviamos un correo para confirmar su cuenta. Ábralo y luego ingrese con su contraseña.');
    if (modo === 'olvido') setAviso('Si existe una cuenta con ese correo, le enviamos un enlace para crear una contraseña nueva.');
  }

  return (
    <main className="bg-hero">
      <div className="mx-auto grid min-h-[70vh] max-w-[440px] place-items-center px-4 py-12">
        <form onSubmit={enviar} className="tarjeta w-full space-y-4 p-7 shadow-[0_12px_32px_-14px_rgb(16_40_32/0.22)]">
          <h1 className="titulo text-[1.6rem]">{modo === 'ingresar' ? 'Ingresar' : modo === 'registro' ? 'Crear cuenta' : 'Recuperar contraseña'}</h1>
          <p className="ayuda">{modo === 'registro' ? 'La cuenta es para quien tramita las denuncias en su empresa. Quien denuncia no necesita cuenta.' : 'Acceso para las personas encargadas de las denuncias.'}</p>
          <label className="block"><span className="etiqueta">Correo electrónico</span><input className="campo" type="email" autoComplete="email" required value={correo} onChange={e => setCorreo(e.target.value)} /></label>
          {modo !== 'olvido' && <label className="block"><span className="etiqueta">Contraseña</span><input className="campo" type="password" minLength={8} autoComplete={modo === 'registro' ? 'new-password' : 'current-password'} required value={clave} onChange={e => setClave(e.target.value)} />{modo === 'registro' && <span className="ayuda">Al menos 8 caracteres.</span>}</label>}
          {error && <p role="alert" className="rounded-xl bg-rosa px-4 py-3 text-[0.9rem] text-riesgo">{error}</p>}
          {aviso && <p role="status" className="rounded-xl bg-menta px-4 py-3 text-[0.9rem] text-primario-f">{aviso}</p>}
          <button className="boton w-full" disabled={ocupado}>{modo === 'ingresar' ? 'Ingresar' : modo === 'registro' ? 'Crear cuenta' : 'Enviar enlace'}</button>
          <div className="flex flex-wrap justify-between gap-2 text-[0.88rem]">
            {modo !== 'ingresar' ? <button type="button" className="enlace" onClick={() => setModo('ingresar')}>Ya tengo cuenta</button>
              : <button type="button" className="enlace" onClick={() => setModo('registro')}>Crear una cuenta</button>}
            {modo === 'ingresar' && <button type="button" className="enlace" onClick={() => setModo('olvido')}>Olvidé mi contraseña</button>}
          </div>
        </form>
      </div>
    </main>
  );
}
