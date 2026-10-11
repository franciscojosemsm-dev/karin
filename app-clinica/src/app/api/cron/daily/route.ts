import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { computeAlerts } from "@/lib/alerts";
import { addDays, fmtDateLong, fmtTime, initials, startOfDay } from "@/lib/dates";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function sendMail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.REMINDER_FROM, to, subject, html }),
  });
  if (!res.ok) console.error("[cron] Resend", res.status, await res.text());
  return res.ok;
}

/**
 * Cron diario (08:00 hora de Chile aprox.):
 *  1) Recordatorio por correo de las sesiones dentro de `reminder_days` (por defecto 2 días antes).
 *  2) Genera y persiste alertas de seguimiento, tareas, cumpleaños e hitos.
 * El correo solo incluye iniciales y hora: nunca contenido clínico.
 */
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const db = createAdminClient();
  const now = new Date();
  const { data: profiles } = await db.from("profiles").select("id,notify_email,reminder_days");
  const summary: Record<string, unknown>[] = [];

  for (const prof of profiles ?? []) {
    const horizon = addDays(startOfDay(now), (prof.reminder_days ?? 2) + 1);

    const [{ data: patients }, { data: sessions }, { data: ms }] = await Promise.all([
      db.from("patients").select("id,full_name,status,risk_high,followup_days,birth_date").eq("owner_id", prof.id),
      db.from("sessions").select("id,patient_id,scheduled_at,duration_min,status,next_tasks_enc,reminder_sent_at").eq("owner_id", prof.id),
      db.from("milestones").select("patient_id,due_date,done,title_enc").eq("owner_id", prof.id),
    ]);
    const P = patients ?? [], S = sessions ?? [];
    const name = (id: string) => P.find((p) => p.id === id)?.full_name ?? "Paciente";

    // 1) Sesiones por recordar
    const due = S.filter((s) => s.status === "programada" && !s.reminder_sent_at &&
      new Date(s.scheduled_at) > now && new Date(s.scheduled_at) < horizon)
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

    // 2) Alertas
    const alerts = computeAlerts(P, S, (ms ?? []).map((m) => ({ ...m, title: decrypt(m.title_enc) })), now);
    if (alerts.length) {
      await db.from("alerts").upsert(
        alerts.map((a) => ({
          owner_id: prof.id, patient_id: a.patientId, kind: a.kind,
          message: `${initials(a.patientName)} — ${a.message}`, dedupe_key: a.key,
        })),
        { onConflict: "owner_id,dedupe_key", ignoreDuplicates: true },
      );
    }
    const urgent = alerts.filter((a) => a.severity !== "baja");

    if (due.length || urgent.length) {
      const base = process.env.APP_URL ?? "";
      const html = `
        <div style="font-family:system-ui,sans-serif;color:#2F3A40;max-width:520px">
          <h2 style="color:#496C5B">Recordatorio de agenda</h2>
          ${due.length ? `<p><strong>Sesiones próximas</strong></p><ul>${due.map((s) =>
            `<li>${esc(fmtDateLong(s.scheduled_at))}, ${fmtTime(s.scheduled_at)} h — ${esc(initials(name(s.patient_id)))}</li>`).join("")}</ul>` : ""}
          ${urgent.length ? `<p><strong>Alertas que requieren atención (${urgent.length})</strong></p><ul>${urgent.map((a) =>
            `<li>${esc(initials(a.patientName))} — ${esc(a.message)}</li>`).join("")}</ul>` : ""}
          <p><a href="${esc(base)}/dashboard">Abrir panel</a></p>
          <p style="font-size:12px;color:#8A969C">Por privacidad este correo no contiene datos clínicos.</p>
        </div>`;
      const sent = await sendMail(prof.notify_email, `Agenda: ${due.length} sesión(es) próxima(s) · ${urgent.length} alerta(s)`, html);
      if (sent && due.length) {
        await db.from("sessions").update({ reminder_sent_at: now.toISOString() }).in("id", due.map((s) => s.id));
      }
      summary.push({ owner: prof.id, reminders: due.length, alerts: alerts.length, mailed: sent });
    } else {
      summary.push({ owner: prof.id, reminders: 0, alerts: alerts.length, mailed: false });
    }
  }
  return NextResponse.json({ ok: true, summary });
}
