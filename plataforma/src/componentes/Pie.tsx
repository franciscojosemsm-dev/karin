import { Link } from 'react-router-dom';
import { SITIO, PSICOAPP, CORREO } from '../lib/enlaces';

export default function Pie() {
  return (
    <footer className="no-imprimir mt-16 border-t border-borde">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-2 px-4 py-6 text-[0.84rem] text-suave md:flex-row md:justify-between md:px-8">
        <span>© 2026 <a className="underline underline-offset-2 hover:text-primario" href={SITIO} target="_blank" rel="noopener noreferrer">Ruiz &amp; Morales Consultores</a></span>
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <a className="hover:text-primario" href={`mailto:${CORREO}`}>{CORREO}</a>
          {PSICOAPP && <a className="hover:text-primario" href={PSICOAPP} target="_blank" rel="noopener noreferrer">PsicoApp</a>}
          <Link className="hover:text-primario" to="/privacidad">Privacidad</Link>
        </span>
      </div>
    </footer>
  );
}
