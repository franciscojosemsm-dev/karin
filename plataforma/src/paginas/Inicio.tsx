import { Link } from 'react-router-dom';
import { ArrowRight, QrCode, Lock, Clock, FileText, MessagesSquare, ListChecks, ShieldCheck } from 'lucide-react';

const funciones = [
  { Icono: QrCode, t: 'Canal de denuncias propio', d: 'Un enlace y un código QR para su empresa, con afiche para imprimir. Pide los datos que exige el reglamento (DS 21/2024, art. 11).' },
  { Icono: FileText, t: 'Comprobante inmediato', d: 'Quien denuncia recibe su comprobante con fecha, hora y folio, y un código para seguir el caso.' },
  { Icono: Lock, t: 'Identidad reservada', d: 'Solo las personas que usted designa ven quién denunció. Cada empresa ve únicamente sus propias denuncias.' },
  { Icono: Clock, t: 'Reloj de plazos', d: 'Cada denuncia calcula sus plazos en días hábiles, con feriados nacionales, y le avisa qué vence y cuándo.' },
  { Icono: MessagesSquare, t: 'Comunicación con quien denuncia', d: 'Mensajes reservados entre la empresa y la persona denunciante, sin intercambiar correos personales.' },
  { Icono: ListChecks, t: 'Bitácora', d: 'Cada avance queda registrado con fecha y autor, para acreditar ante una fiscalización lo que hizo la empresa.' }
];

export default function Inicio() {
  return (
    <main>
      <section className="bg-hero">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center px-4 pb-20 pt-16 text-center md:pt-24">
          <p className="pildora border border-borde bg-white text-suave"><ShieldCheck className="size-3.5 text-primario" aria-hidden />Ley 21.643 · Ley Karin</p>
          <h1 className="titulo mt-5 max-w-[20ch] text-[2.3rem] leading-[1.08] md:text-[3.3rem]">El canal de denuncias y los plazos de la Ley Karin, en un solo lugar</h1>
          <p className="mt-5 max-w-[50ch] text-[1.05rem] text-suave">Reciba denuncias con reserva de identidad y lleve el control de cada plazo legal, desde la recepción hasta la aplicación de medidas.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link className="boton" to="/ingresar">Crear el canal de mi empresa<ArrowRight className="size-4" aria-hidden /></Link>
            <Link className="boton-s" to="/seguimiento">Seguir una denuncia</Link>
          </div>
          <p className="ayuda mt-4">Versión piloto.</p>
        </div>
      </section>
      <section className="mx-auto max-w-[1100px] px-4 py-14">
        <div className="grid gap-4 md:grid-cols-3">
          {funciones.map(({ Icono, t, d }) => (
            <div key={t} className="tarjeta p-6">
              <Icono className="size-[22px] text-primario" aria-hidden />
              <h2 className="mt-3 font-semibold">{t}</h2>
              <p className="mt-1.5 text-[0.93rem] text-suave">{d}</p>
            </div>
          ))}
        </div>
        <div className="tarjeta mt-6 flex flex-col items-start gap-3 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="titulo text-[1.3rem]">¿Necesita una investigación externa?</h2>
            <p className="text-suave">Ruiz &amp; Morales Consultores conduce investigaciones con abogado y psicóloga clínica, por encargo del empleador.</p>
          </div>
          <a className="boton-s" href="https://ruizmorales-consultores.lovable.app/#contacto" target="_blank" rel="noreferrer">Conocer el servicio</a>
        </div>
      </section>
    </main>
  );
}
