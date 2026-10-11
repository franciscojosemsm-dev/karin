import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { computeAlerts } from "@/lib/alerts";
import { addDays, fmtDateLong, fmtTime, startOfDay, startOfWeek } from "@/lib/dates";
import { SESSION_LABEL, type SessionStatus } from "@/lib/types";
import { AlertsPanel } from "@/components/AlertsPanel";
import { QuickNoteForm } from "@/components/QuickNoteForm";
import { processQuickNote } from "../actions";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = createClient();
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = addDays(dayStart, 1);
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);

  const [patients, sessions, milestones, notes] = await Promise.all([
    supabase.from("patients").select("id,full_name,status,risk_high,followup_days,birth_date"),
    supabase.from("sessions").select("id,patient_id,scheduled_at,duration_min,status,next_tasks_enc").order("scheduled_at"),
    supabase.from("milestones").select("patient_id,due_date,done,title_enc"),
    supabase.from("quick_notes").select("id,patient_id,body_enc,created_at").eq("processed", false).order("created_at", { ascending: false }),
  ]);

  const P = patients.data ?? [];
  const S = sessions.data ?? [];
  const names = new Map(P.map((p) => [p.id, p]));

  const today = S.filter((s) => s.scheduled_at >= dayStart.toISOString() && s.scheduled_at < dayEnd.toISOString() && s.status !== "cancelada");
  const weekCount = S.filter((s) => s.scheduled_at >= weekStart.toISOString() && s.scheduled_at < weekEnd.toISOString() && ["programada", "realizada"].includes(s.status)).length;
  const alerts = computeAlerts(P, S, (milestones.data ?? []).map((m) => ({ ...m, title: decrypt(m.title_enc) })), now);
  const atRisk = P.filter((p) => p.risk_high && p.status === "activo");

  return (
    <div className="space-y-6">
      <div>
        <h1>Buen día</h1>
        <p className="capitalize text-tinta-suave">{fmtDateLong(now)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sesiones esta semana" value={weekCount} tone="salvia" />
        <Stat label="Sesiones hoy" value={today.length} tone="lavanda" />
        <Stat label="Pacientes en riesgo alto" value={atRisk.length} tone={atRisk.length ? "riesgo" : "salvia"} />
        <Stat label="Notas por procesar" value={(notes.data ?? []).length} tone="arena" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2" aria-labelledby="agenda-h">
          <h2 id="agenda-h" className="mb-3">Agenda del día</h2>
          {today.length === 0 ? (
            <p className="text-sm text-tinta-suave">Sin sesiones programadas para hoy.</p>
          ) : (
            <ul className="divide-y divide-salvia-100">
              {today.map((s) => {
                const p = names.get(s.patient_id);
                return (
                  <li key={s.id}>
                    <Link href={`/pacientes/${s.patient_id}`} className="flex items-center gap-4 py-3 hover:bg-salvia-50">
                      <span className="w-14 font-medium tabular-nums text-salvia-700">{fmtTime(s.scheduled_at)}</span>
                      <span className="flex-1">
                        {p?.full_name}
                        {p?.risk_high && <span className="chip ml-2 bg-riesgo-100 text-riesgo-700">Riesgo alto</span>}
                      </span>
                      <span className="text-sm text-tinta-tenue">{SESSION_LABEL[s.status as SessionStatus]} · {s.duration_min} min</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="qn-h">
          <h2 id="qn-h" className="mb-3">Notas rápidas</h2>
          <QuickNoteForm patients={P.filter((p) => p.status !== "alta").map((p) => ({ id: p.id, full_name: p.full_name }))} />
          <ul className="mt-4 space-y-2">
            {(notes.data ?? []).map((n) => (
              <li key={n.id} className="rounded-xl bg-arena-50 p-3 text-sm">
                <p>{decrypt(n.body_enc)}</p>
                <div className="mt-1 flex items-center justify-between text-xs text-tinta-tenue">
                  <span>{n.patient_id ? names.get(n.patient_id)?.full_name : "General"}</span>
                  <form action={processQuickNote.bind(null, n.id)}><button className="text-salvia-700 underline">Marcar procesada</button></form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <AlertsPanel alerts={alerts} />
    </div>
  );
}

const TONES = {
  salvia: "bg-salvia-100 text-salvia-700", lavanda: "bg-lavanda-100 text-lavanda-600",
  arena: "bg-arena-100 text-tinta-suave", riesgo: "bg-riesgo-100 text-riesgo-700",
} as const;

function Stat({ label, value, tone }: { label: string; value: number; tone: keyof typeof TONES }) {
  return (
    <div className={`rounded-xl2 p-5 ${TONES[tone]}`}>
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm opacity-80">{label}</p>
    </div>
  );
}
