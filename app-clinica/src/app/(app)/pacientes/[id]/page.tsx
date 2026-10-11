import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { ageFrom, fmtDate, fmtTime } from "@/lib/dates";
import { SESSION_LABEL, STATUS_LABEL, type PatientRow, type SessionRow, type SessionStatus } from "@/lib/types";
import { RiskSwitch } from "@/components/RiskSwitch";
import { KeyNotesForm } from "@/components/KeyNotesForm";
import { SessionNoteForm } from "@/components/SessionNoteForm";
import { ScheduleForm } from "@/components/ScheduleForm";
import { MilestoneForm } from "@/components/MilestoneForm";
import { PatientForm } from "@/components/PatientForm";
import { completeMilestone, logPatientView, setSessionStatus, updatePatient } from "../../actions";

export const dynamic = "force-dynamic";

export default async function Ficha({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: p }, { data: sessions }, { data: milestones }] = await Promise.all([
    supabase.from("patients").select("*").eq("id", params.id).maybeSingle<PatientRow>(),
    supabase.from("sessions").select("*").eq("patient_id", params.id).order("scheduled_at", { ascending: false }).returns<SessionRow[]>(),
    supabase.from("milestones").select("id,title_enc,due_date").eq("patient_id", params.id).eq("done", false).order("due_date"),
  ]);
  if (!p) notFound();
  await logPatientView(p.id);

  const age = ageFrom(p.birth_date);
  const upcoming = (sessions ?? []).filter((s) => s.status === "programada" && new Date(s.scheduled_at) > new Date()).reverse();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1>{p.full_name}</h1>
        <span className="chip bg-salvia-100 text-salvia-700">{STATUS_LABEL[p.status]}</span>
        {p.risk_high && <span className="chip bg-riesgo-600 text-white">⚠ RIESGO ALTO</span>}
        <span className="text-sm text-tinta-suave">
          {age !== null && `${age} años · `}{p.phone ?? ""} {p.email ? `· ${p.email}` : ""}
        </span>
      </header>

      {/* Lo primero que se ve: riesgo y notas clave */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <RiskSwitch patientId={p.id} initial={p.risk_high} note={decrypt(p.risk_note_enc)} />
          <section className="card">
            <h2 className="mb-2">Próximas sesiones</h2>
            {upcoming.length === 0 ? <p className="mb-3 text-sm text-tinta-suave">Sin citas futuras.</p> : (
              <ul className="mb-3 text-sm">
                {upcoming.map((s) => <li key={s.id} className="py-1">{fmtDate(s.scheduled_at)} · {fmtTime(s.scheduled_at)}</li>)}
              </ul>
            )}
            <ScheduleForm patientId={p.id} />
            <p className="mt-2 text-xs text-tinta-tenue">Se sincroniza con Google Calendar y recuerda 2 días antes.</p>
          </section>
        </div>
        <KeyNotesForm patientId={p.id} value={decrypt(p.key_notes_enc)} />
      </div>

      <section className="card">
        <h2 className="mb-3">Hitos terapéuticos</h2>
        <ul className="mb-3 space-y-1 text-sm">
          {(milestones ?? []).map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-xl bg-lavanda-50 px-3 py-2">
              <span>◆ {decrypt(m.title_enc)} · {fmtDate(m.due_date + "T12:00:00Z")}</span>
              <form action={completeMilestone.bind(null, m.id, p.id)}><button className="text-lavanda-600 underline">Cumplido</button></form>
            </li>
          ))}
        </ul>
        <MilestoneForm patientId={p.id} />
      </section>

      <section className="card">
        <h2 className="mb-3">Historial de sesiones</h2>
        <div className="space-y-3">
          {(sessions ?? []).map((s) => (
            <details key={s.id} className="rounded-xl border border-salvia-100 p-4" open={s.status === "programada" && new Date(s.scheduled_at) <= new Date()}>
              <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                <span className="font-medium">{fmtDate(s.scheduled_at)} · {fmtTime(s.scheduled_at)}</span>
                <span className="chip bg-salvia-100 text-salvia-700">{SESSION_LABEL[s.status]}</span>
              </summary>
              <SessionNoteForm
                sessionId={s.id} patientId={p.id}
                symptoms={decrypt(s.symptoms_enc)} intervention={decrypt(s.intervention_enc)} nextTasks={decrypt(s.next_tasks_enc)}
              />
              {s.status === "programada" && (
                <div className="mt-3 flex gap-2">
                  {(["cancelada", "no_asistio"] as SessionStatus[]).map((st) => (
                    <form key={st} action={setSessionStatus.bind(null, s.id, p.id, st)}><button className="btn-ghost">{SESSION_LABEL[st]}</button></form>
                  ))}
                </div>
              )}
            </details>
          ))}
          {(sessions ?? []).length === 0 && <p className="text-sm text-tinta-suave">Aún no hay sesiones.</p>}
        </div>
      </section>

      <details className="card">
        <summary className="cursor-pointer font-semibold">Datos del expediente</summary>
        <div className="mt-4">
          <PatientForm
            action={updatePatient.bind(null, p.id)}
            submitLabel="Guardar cambios"
            values={{
              full_name: p.full_name, birth_date: p.birth_date ?? "", email: p.email ?? "", phone: p.phone ?? "",
              status: p.status, reason: decrypt(p.reason_enc), history: decrypt(p.history_enc),
              followup_days: p.followup_days?.toString() ?? "",
            }}
          />
        </div>
      </details>
    </div>
  );
}
