import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import Marca from './Marca';
import { supabase } from '../lib/supabase';
import { useSesion } from '../lib/sesion';

export default function Encabezado() {
  const { sesion } = useSesion();
  const navegar = useNavigate();
  return (
    <header className="no-imprimir sticky top-0 z-30 border-b border-borde bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-[60px] max-w-[1100px] items-center justify-between gap-3 px-4 md:px-8">
        <Link to={sesion ? '/panel' : '/'} aria-label="Plataforma Karin, inicio"><Marca /></Link>
        {sesion ? (
          <div className="flex items-center gap-1 sm:gap-2">
            <nav className="flex items-center gap-1" aria-label="Secciones">
              {[['/panel', 'Denuncias'], ['/mesa', 'Investigador']].map(([to, t]) => (
                <NavLink key={to} to={to} className={({ isActive }) => `rounded-lg px-2.5 py-2 text-[0.88rem] font-medium ${isActive ? 'bg-menta-f text-primario-f' : 'text-suave hover:bg-menta'}`}>{t}</NavLink>
              ))}
            </nav>
            <span className="hidden max-w-[200px] truncate text-[0.85rem] text-suave lg:inline">{sesion.user.email}</span>
            <button className="boton-s" onClick={async () => { await supabase.auth.signOut(); navegar('/'); }}>
              <LogOut className="size-4" aria-hidden /><span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link className="boton-s hidden sm:inline-flex" to="/seguimiento">Seguir mi denuncia</Link>
            <Link className="boton" to="/ingresar">Ingresar</Link>
          </div>
        )}
      </div>
    </header>
  );
}
