import { createAdminClient } from "@/lib/supabase/admin";
import { initials } from "@/lib/dates";

export const dynamic = "force-dynamic";

const ics = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/**
 * Feed iCalendar (suscripción) para Apple Calendar / Outlook / Google (por URL).
 * Cada evento incluye VALARM a `reminder_days` días antes. Solo iniciales, sin datos clínicos.
 * Nota: Google Calendar ignora las alarmas de feeds suscritos; para ello existe la
 * sincronización directa por API (src/lib/google-calendar.ts).
 */
export async function GET(_: Request, { params }: { params: { token: string } }) {
  const db = createAdminClient();
  const { data: prof } = await db.from("profiles").select("id,reminder_days").eq("ics_token", params.token).maybeSingle();
  if (!prof) return new Response("No encontrado", { status: 404 });

  const from = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data } = await db.from("sessions")
    .select("id,scheduled_at,duration_min,patients(full_name)")
    .eq("owner_id", prof.id).eq("status", "programada").gte("scheduled_at", from).order("scheduled_at");

  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Agenda Clinica//ES", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Agenda Clínica"];
  for (const s of data ?? []) {
    const start = new Date(s.scheduled_at);
    const end = new Date(start.getTime() + s.duration_min * 60_000);
    const p = s.patients as unknown as { full_name: string } | null;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${s.id}@agenda-clinica`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${ics(`Sesión · ${initials(p?.full_name ?? "Paciente")}`)}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Sesión en 2 días", `TRIGGER:-P${prof.reminder_days}D`, "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" },
  });
}
