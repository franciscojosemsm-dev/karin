import { daysBetween, daysToBirthday, initials, fmtDate } from "./dates";

export interface AlertItem {
  key: string;
  kind: "riesgo" | "seguimiento" | "tarea_control" | "cumpleanos" | "hito";
  patientId: string;
  patientName: string;
  message: string;
  severity: "alta" | "media" | "baja";
}

interface P { id: string; full_name: string; status: string; risk_high: boolean; followup_days: number | null; birth_date: string | null }
interface S { patient_id: string; scheduled_at: string; status: string; next_tasks_enc?: string | null }
interface M { patient_id: string; due_date: string; done: boolean; title: string }

const RISK_DEFAULT_FOLLOWUP_DAYS = 7;

/**
 * Calcula las alertas "vivas" a partir de pacientes, sesiones e hitos.
 * Se usa tanto en el Dashboard (tiempo real) como en el cron diario (persistencia / correo).
 */
export function computeAlerts(patients: P[], sessions: S[], milestones: M[], now = new Date()): AlertItem[] {
  const out: AlertItem[] = [];
  const today = now.toISOString().slice(0, 10);

  for (const p of patients) {
    if (p.status === "alta") continue;
    const mine = sessions.filter((s) => s.patient_id === p.id);
    const past = mine.filter((s) => s.status === "realizada" && new Date(s.scheduled_at) <= now);
    const future = mine.filter((s) => s.status === "programada" && new Date(s.scheduled_at) > now);
    const last = past.sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))[0];

    if (p.risk_high && p.status === "activo") {
      out.push({
        key: `riesgo:${p.id}`, kind: "riesgo", patientId: p.id, patientName: p.full_name, severity: "alta",
        message: "Marcado como RIESGO ALTO. Revisar notas clave antes de contactar.",
      });
    }

    const limit = p.followup_days ?? (p.risk_high ? RISK_DEFAULT_FOLLOWUP_DAYS : null);
    if (limit && p.status === "activo" && future.length === 0) {
      const ref = last ? new Date(last.scheduled_at) : null;
      const days = ref ? daysBetween(ref, now) : null;
      if (days === null || days > limit) {
        out.push({
          key: `seguimiento:${p.id}:${today}`, kind: "seguimiento", patientId: p.id, patientName: p.full_name,
          severity: p.risk_high ? "alta" : "media",
          message: days === null
            ? `Sin sesiones registradas ni cita futura (límite ${limit} días).`
            : `${days} días sin sesión y sin cita agendada (límite ${limit}).`,
        });
      }
    }

    // Tarea/control pendiente: última sesión con tareas y sin cita futura pasados 5 días
    if (last?.next_tasks_enc && future.length === 0 && p.status === "activo" && daysBetween(new Date(last.scheduled_at), now) >= 5) {
      out.push({
        key: `tarea_control:${p.id}:${last.scheduled_at}`, kind: "tarea_control", patientId: p.id, patientName: p.full_name,
        severity: "baja", message: "Hay tareas acordadas en la última sesión: enviar recurso o control.",
      });
    }

    const dtb = daysToBirthday(p.birth_date);
    if (dtb !== null && dtb <= 7 && p.status !== "alta") {
      out.push({
        key: `cumpleanos:${p.id}:${today.slice(0, 4)}`, kind: "cumpleanos", patientId: p.id, patientName: p.full_name,
        severity: "baja", message: dtb === 0 ? "Cumple años hoy." : `Cumpleaños en ${dtb} día${dtb === 1 ? "" : "s"}.`,
      });
    }
  }

  for (const m of milestones) {
    if (m.done) continue;
    const p = patients.find((x) => x.id === m.patient_id);
    if (!p) continue;
    const diff = Math.round((new Date(m.due_date + "T12:00:00Z").getTime() - new Date(today + "T12:00:00Z").getTime()) / 86_400_000);
    if (diff <= 7) {
      out.push({
        key: `hito:${m.patient_id}:${m.due_date}:${m.title}`, kind: "hito", patientId: p.id, patientName: p.full_name, severity: "baja",
        message: `Hito «${m.title}» ${diff < 0 ? "vencido" : diff === 0 ? "hoy" : `en ${diff} día${diff === 1 ? "" : "s"}`} (${fmtDate(m.due_date + "T12:00:00Z")}).`,
      });
    }
  }

  const rank = { alta: 0, media: 1, baja: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export { initials };
