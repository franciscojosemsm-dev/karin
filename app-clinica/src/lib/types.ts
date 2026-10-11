export type PatientStatus = "activo" | "en_pausa" | "alta";
export type SessionStatus = "programada" | "realizada" | "cancelada" | "no_asistio";

export interface PatientRow {
  id: string;
  full_name: string;
  birth_date: string | null;
  email: string | null;
  phone: string | null;
  status: PatientStatus;
  reason_enc: string | null;
  history_enc: string | null;
  key_notes_enc: string | null;
  risk_high: boolean;
  risk_note_enc: string | null;
  risk_marked_at: string | null;
  followup_days: number | null;
}

export interface SessionRow {
  id: string;
  patient_id: string;
  scheduled_at: string;
  duration_min: number;
  status: SessionStatus;
  symptoms_enc: string | null;
  intervention_enc: string | null;
  next_tasks_enc: string | null;
  google_event_id: string | null;
  reminder_sent_at: string | null;
}

export const STATUS_LABEL: Record<PatientStatus, string> = { activo: "Activo", en_pausa: "En pausa", alta: "Alta" };
export const SESSION_LABEL: Record<SessionStatus, string> = {
  programada: "Programada", realizada: "Realizada", cancelada: "Cancelada", no_asistio: "No asistió",
};
