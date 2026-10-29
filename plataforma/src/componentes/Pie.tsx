export default function Pie() {
  return (
    <footer className="no-imprimir mt-16 border-t border-borde bg-white">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-2 px-4 py-6 text-[0.84rem] text-suave md:flex-row md:justify-between md:px-8">
        <span>© 2026 Ruiz &amp; Morales Consultores · Plataforma Karin</span>
        <span>
          <a className="hover:text-primario" href="mailto:ruizmoralesconsultores@gmail.com">ruizmoralesconsultores@gmail.com</a>
          {' · '}<a className="hover:text-primario" href="/privacidad">Privacidad</a>
        </span>
      </div>
    </footer>
  );
}
