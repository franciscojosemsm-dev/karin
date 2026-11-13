import { Link } from 'react-router-dom';
import { SITIO_CONTACTO } from '../lib/enlaces';

const plazos = [
  ['De inmediato', 'Adoptar medidas de resguardo', 'art. 13'],
  ['3 días hábiles', 'Informar a la Dirección del Trabajo o derivarle la denuncia', 'art. 12'],
  ['30 días hábiles', 'Concluir la investigación', 'art. 17'],
  ['2 días hábiles', 'Remitir el informe a la Dirección del Trabajo', 'art. 18'],
  ['15 días corridos', 'Aplicar las medidas o sanciones', 'art. 19']
];

const funciones = [
  ['Canal propio', 'Un enlace y un código QR para su empresa, con afiche para imprimir. El formulario pide los datos que exige el reglamento (DS 21/2024, art. 11).'],
  ['Comprobante', 'Quien denuncia recibe folio, fecha y hora, y un código con clave para seguir el caso.'],
  ['Identidad reservada', 'La identidad se guarda aparte del relato y la ven solo las personas que usted designa. Cada empresa ve sus propias denuncias y ninguna otra.'],
  ['Plazos', 'Cada denuncia calcula sus plazos en días hábiles, con los feriados nacionales y los días inhábiles de su empresa. Se exportan al calendario.'],
  ['Mensajes', 'La empresa y la persona denunciante se escriben dentro de la plataforma, sin usar correos personales.'],
  ['Bitácora', 'Cada actuación queda con fecha y autor. Sirve para mostrar en una fiscalización qué hizo la empresa y cuándo.']
];

export default function Inicio() {
  return (
    <main>
      <section className="border-b border-borde">
        <div className="mx-auto grid max-w-[1100px] gap-10 px-4 py-12 md:grid-cols-[1.1fr_0.9fr] md:gap-14 md:px-8 md:py-16">
          <div>
            <p className="text-[0.86rem] text-suave">Ley 21.643 y su reglamento · versión piloto</p>
            <h1 className="titulo mt-3 max-w-[20ch] text-[2rem] md:text-[2.6rem]">Canal de denuncias y control de plazos de la Ley Karin</h1>
            <p className="mt-4 max-w-[52ch] text-[1.03rem] text-suave">Su empresa recibe las denuncias por un enlace propio. Desde ese momento la plataforma calcula cada plazo en días hábiles y le muestra qué vence primero.</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link className="boton" to="/ingresar">Crear el canal de mi empresa</Link>
              <Link className="enlace" to="/seguimiento">Seguir una denuncia</Link>
            </div>
          </div>
          <div>
            <h2 className="text-[0.86rem] font-bold">Los plazos que controla</h2>
            <table className="mt-2 w-full border-t border-texto text-[0.93rem]">
              <tbody>
                {plazos.map(([plazo, hito, art]) => (
                  <tr key={hito} className="border-b border-borde align-top">
                    <th scope="row" className="cifra w-[9.5rem] py-2.5 pr-3 text-left font-bold">{plazo}</th>
                    <td className="py-2.5">{hito} <span className="whitespace-nowrap text-suave">({art})</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="ayuda mt-2">Artículos del DS 21/2024 del Ministerio del Trabajo. Los días hábiles excluyen sábados, domingos y festivos (art. 1).</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-4 py-12 md:px-8">
        <h2 className="titulo text-[1.45rem]">Qué hace la plataforma</h2>
        <dl className="mt-5 grid gap-x-14 md:grid-cols-2">
          {funciones.map(([t, d]) => (
            <div key={t} className="grid gap-1 border-t border-borde py-4 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="font-bold">{t}</dt>
              <dd className="text-[0.95rem] text-suave">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-[1100px] px-4 pb-6 md:px-8">
        <div className="grid gap-10 border-t border-texto pt-8 md:grid-cols-2 md:gap-14">
          <div>
            <h2 className="titulo text-[1.3rem]">Mesa del investigador</h2>
            <p className="mt-2 text-[0.97rem] text-suave">Para quien conduce la investigación. El expediente se cifra en su navegador antes de guardarse, de modo que ni la consultora ni el proveedor de la base de datos pueden leerlo. Incluye la lista de control del DS 21/2024, las actas de declaración para firmar en cada hoja y el informe con el contenido del art. 16.</p>
            <p className="mt-3"><Link className="enlace" to="/mesa">Abrir mi mesa</Link></p>
          </div>
          <div>
            <h2 className="titulo text-[1.3rem]">Investigación externa</h2>
            <p className="mt-2 text-[0.97rem] text-suave">Si su empresa prefiere encargar la investigación, Ruiz &amp; Morales Consultores la conduce con un abogado y una psicóloga clínica, por encargo del empleador.</p>
            <p className="mt-3"><a className="enlace" href={SITIO_CONTACTO} target="_blank" rel="noopener noreferrer">Pedir una evaluación inicial</a></p>
          </div>
        </div>
      </section>
    </main>
  );
}
