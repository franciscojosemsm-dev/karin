/* Aviso diario de plazos (lunes a viernes a las 12:00 UTC: 8:00 en Chile en horario de invierno y 9:00 en horario de verano).
   Envía a cada empresa un resumen con los plazos que vencen hoy o dentro de 2 días hábiles y los ya vencidos.
   El correo no incluye nombres ni relatos: solo folio, trámite y fecha, con enlace al panel.
   Requiere en Netlify: SUPABASE_SERVICE_ROLE_KEY y RESEND_API_KEY (y opcionalmente AVISOS_REMITENTE y SITIO_URL).
   Sin esas variables no hace nada. */
import { calcularHitos, type Hito } from '../../src/lib/plazos';
import { hoyEnChile, fechaLarga } from '../../src/lib/fechas';

const SUPABASE = 'https://lzcczwkaoouvuzlknxoh.supabase.co';

type Fila = Record<string, unknown> & { id: string; folio: number; empresa_id: string; estado: string; recibida_en: string };
type Empresa = { id: string; nombre: string; correo_contacto: string | null; inhabiles_extra: string[] };

async function rest<T>(ruta: string, clave: string): Promise<T> {
  const r = await fetch(`${SUPABASE}/rest/v1/${ruta}`, { headers: { apikey: clave, Authorization: `Bearer ${clave}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function correosAdministradores(empresa: string, clave: string): Promise<string[]> {
  const miembros = await rest<{ user_id: string }[]>(`miembros?select=user_id&empresa_id=eq.${empresa}&rol=eq.administrador`, clave);
  const correos: string[] = [];
  for (const m of miembros) {
    const r = await fetch(`${SUPABASE}/auth/v1/admin/users/${m.user_id}`, { headers: { apikey: clave, Authorization: `Bearer ${clave}` } });
    if (r.ok) { const u = await r.json() as { email?: string }; if (u.email) correos.push(u.email); }
  }
  return correos;
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export default async () => {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY, resend = process.env.RESEND_API_KEY;
  if (!clave || !resend) { console.log('Avisos desactivados: faltan SUPABASE_SERVICE_ROLE_KEY o RESEND_API_KEY.'); return new Response('desactivado'); }
  const sitio = process.env.SITIO_URL ?? 'https://plataforma-karin.netlify.app';
  const remitente = process.env.AVISOS_REMITENTE ?? 'Plataforma Karin <onboarding@resend.dev>';
  const hoy = hoyEnChile();

  const empresas = await rest<Empresa[]>('empresas?select=id,nombre,correo_contacto,inhabiles_extra', clave);
  const denuncias = await rest<Fila[]>('denuncias?select=*&estado=neq.cerrada', clave);
  let enviados = 0;
  for (const e of empresas) {
    const items: { folio: number; h: Hito }[] = [];
    for (const d of denuncias.filter(x => x.empresa_id === e.id)) {
      for (const h of calcularHitos(d as never, hoy, e.inhabiles_extra)) {
        if (!h.cumplido && !h.informativo && ['vencido', 'hoy', 'proximo'].includes(h.estado)) items.push({ folio: d.folio, h });
      }
    }
    if (!items.length) continue;
    const para = e.correo_contacto ? [e.correo_contacto] : await correosAdministradores(e.id, clave);
    if (!para.length) continue;
    const filas = items.sort((a, b) => a.h.vence!.localeCompare(b.h.vence!)).map(({ folio, h }) =>
      `<tr><td style="padding:6px 10px">N.º ${folio}</td><td style="padding:6px 10px">${esc(h.titulo)}</td><td style="padding:6px 10px;white-space:nowrap">${h.estado === 'vencido' ? '<b style="color:#b4233c">Vencido</b> el ' : h.estado === 'hoy' ? '<b style="color:#b4233c">Vence hoy</b>, ' : 'Vence el '}${fechaLarga(h.vence)}</td></tr>`).join('');
    const html = `<div style="font-family:Arial,sans-serif;color:#1c2725"><h2 style="color:#047857">Plazos de denuncias · ${esc(e.nombre)}</h2>
      <p>Estos plazos de la Ley 21.643 vencen pronto o ya vencieron:</p><table style="border-collapse:collapse;border:1px solid #d9e2de">${filas}</table>
      <p><a href="${sitio}/panel" style="color:#047857;font-weight:bold">Abrir el panel</a></p>
      <p style="font-size:12px;color:#56625e">Aviso automático de Plataforma Karin · Ruiz &amp; Morales Consultores. Por reserva, este correo no incluye nombres ni relatos.</p></div>`;
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: remitente, to: para, subject: `Plazos de denuncias por atender · ${e.nombre}`, html })
    });
    if (r.ok) enviados++; else console.error('Resend', r.status, await r.text());
  }
  console.log(`Avisos enviados: ${enviados}`);
  return new Response(`enviados ${enviados}`);
};

export const config = { schedule: '0 12 * * 1-5' };
