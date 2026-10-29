import { Scale } from 'lucide-react';

export default function Marca({ chica = false }: { chica?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap">
      <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-primario text-white" aria-hidden><Scale className="size-[17px]" /></span>
      <span className="leading-tight">
        <span className="titulo block text-[1.05rem]">Plataforma Karin</span>
        {!chica && <span className="block text-[0.72rem] font-medium text-suave">por Ruiz &amp; Morales Consultores</span>}
      </span>
    </span>
  );
}
