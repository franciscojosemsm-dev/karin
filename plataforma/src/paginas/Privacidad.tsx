export default function Privacidad() {
  return (
    <main className="mx-auto max-w-[760px] space-y-4 px-4 py-10 text-[0.97rem]">
      <h1 className="titulo text-[2rem]">Privacidad y tratamiento de datos</h1>
      <p><b>Quién trata sus datos.</b> Las denuncias que se presentan en el canal de una empresa son tratadas por esa empresa, como empleadora, para tramitarlas conforme a la Ley 21.643 y su reglamento. Ruiz &amp; Morales Consultores provee la plataforma y trata los datos por cuenta de la empresa, solo para prestar el servicio.</p>
      <p><b>Qué datos se reúnen.</b> Los que pide el formulario: identificación y contacto de la persona afectada y, si corresponde, de quien denuncia; personas denunciadas; relato de los hechos y antecedentes; y los mensajes que se intercambien. De las cuentas de empresa, el correo y la contraseña cifrada.</p>
      <p><b>Quién los ve.</b> Solo las personas que la empresa designa para tramitar denuncias. La identidad de las personas se guarda separada del relato, con acceso restringido. Cada empresa ve únicamente sus propias denuncias.</p>
      <p><b>Dónde se guardan.</b> En una base de datos de Supabase alojada en la región de São Paulo (Brasil), con cifrado en tránsito y en reposo provisto por ese servicio. El sitio se sirve desde Netlify.</p>
      <p><b>Mesa del investigador.</b> Los expedientes de investigación se cifran en el navegador de quien investiga, con una clave que solo esa persona conoce, antes de enviarse al servidor. Ruiz &amp; Morales Consultores y el proveedor de la base de datos guardan solo el contenido cifrado y no pueden leerlo. Quien investiga es responsable de esos datos frente a la empresa que le encargó la investigación.</p>
      <p><b>Consultas y derechos.</b> Para ejercer sus derechos sobre los datos de una denuncia, diríjase a la empresa respectiva. Para consultas sobre la plataforma, escriba a <a className="enlace" href="mailto:ruizmoralesconsultores@gmail.com">ruizmoralesconsultores@gmail.com</a>.</p>
    </main>
  );
}
