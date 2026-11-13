/* Monograma de Ruiz & Morales (el del afiche y el sitio) junto al nombre del producto. */
export default function Marca({ chica = false }: { chica?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3 whitespace-nowrap">
      <img src="/img/monograma-rm.png" alt="" aria-hidden className="h-8 w-auto" width={480} height={219} />
      <span className="leading-tight">
        <span className="titulo block text-[1.02rem]">Plataforma Karin</span>
        {!chica && <span className="block text-[0.72rem] text-suave">Ruiz &amp; Morales Consultores</span>}
      </span>
    </span>
  );
}
