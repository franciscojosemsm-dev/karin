"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { localInputToISO, initials } from "@/lib/dates";
import { upsertEvent, deleteEvent } from "@/lib/google-calendar";
import type { SessionStatus, PatientStatus } from "@/lib/types";

export type FormState = { ok?: boolean; error?: string };

async function ctx() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const orNull = (v: string) => (v === "" ? null : v);

async function audit(action: string, entity: string, entityId?: string) {
  const { supabase } = await ctx();
  await supabase.from("audit_log").insert({ action, entity, entity_id: entityId ?? null });
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/* ---------------- Pacientes ---------------- */

function patientPayload(f: FormData) {
  const status = str(f, "status") as PatientStatus;
  const follow = parseInt(str(f, "followup_days"), 10);
  return {
    full_name: str(f, "full_name"),
    birth_date: orNull(str(f, "birth_date")),
    email: orNull(str(f, "email")),
    phone: orNull(str(f, "phone")),
    status: (["activo", "en_pausa", "alta"].includes(status) ? status : "activo") as PatientStatus,
    reason_enc: encrypt(str(f, "reason")),
    history_enc: encrypt(str(f, "history")),
    followup_days: Number.isFinite(follow) && follow > 0 ? follow : null,
  };
}

export async function createPatient(_: FormState, f: FormData): Promise<FormState> {
  const { supabase } = await ctx();
  const payload = patientPayload(f);
  if (!payload.full_name) return { error: "El nombre es obligatorio." };
  const { data, error } = await supabase.from("patients").insert(payload).select("id").single();
  if (error) return { error: "No se pudo crear el expediente." };
  await audit("crear_paciente", "patients", data.id);
  revalidatePath("/pacientes");
  redirect(`/pacientes/${data.id}`);
}

export async function updatePatient(id: string, _: FormState, f: FormData): Promise<FormState> {
  const { supabase } = await ctx();
  const payload = patientPayload(f);
  if (!payload.full_name) return { error: "El nombre es obligatorio." };
  const { error } = await supabase.from("patients").update(payload).eq("id", id);
  if (error) return { error: "No se pudo guardar." };
  await audit("editar_paciente", "patients", id);
  revalidatePath(`/pacientes/${id}`);
  return { ok: true };
}

export async function setRisk(id: string, high: boolean, note: string) {
  const { supabase } = await ctx();
  await supabase.from("patients").update({
    risk_high: high,
    risk_note_enc: high ? encrypt(note) : null,
    risk_marked_at: high ? new Date().toISOString() : null,
  }).eq("id", id);
  await audit(high ? "marcar_riesgo_alto" : "quitar_riesgo", "patients", id);
  revalidatePath(`/pacientes/${id}`);
  revalidatePath("/pacientes");
  revalidatePath("/dashboard");
}

export async function saveKeyNotes(id: string, _: FormState, f: FormData): Promise<FormState> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("patients").update({ key_notes_enc: encrypt(str(f, "key_notes")) }).eq("id", id);
  if (error) return { error: "No se pudo guardar." };
  await audit("editar_notas_clave", "patients", id);
  revalidatePath(`/pacientes/${id}`);
  return { ok: true };
}

/* ---------------- Sesiones ---------------- */

async function syncCalendar(sessionId: string) {
  const { supabase } = await ctx();
  const { data: s } = await supabase
    .from("sessions").select("id,scheduled_at,duration_min,google_event_id,patients(full_name)").eq("id", sessionId).single();
  if (!s) return;
  const { data: prof } = await supabase.from("profiles").select("reminder_days").single();
  const name = (s.patients as unknown as { full_name: string } | null)?.full_name ?? "Paciente";
  const eventId = await upsertEvent(
    { id: s.id, scheduledAt: s.scheduled_at, durationMin: s.duration_min, label: initials(name), reminderDays: prof?.reminder_days ?? 2 },
    s.google_event_id,
  );
  if (eventId && eventId !== s.google_event_id) await supabase.from("sessions").update({ google_event_id: eventId }).eq("id", s.id);
}

export async function scheduleSession(patientId: string, _: FormState, f: FormData): Promise<FormState> {
  const { supabase } = await ctx();
  const when = str(f, "scheduled_at");
  if (!when) return { error: "Indique fecha y hora." };
  const duration = parseInt(str(f, "duration_min"), 10) || 50;
  const { data, error } = await supabase.from("sessions")
    .insert({ patient_id: patientId, scheduled_at: localInputToISO(when), duration_min: duration })
    .select("id").single();
  if (error) return { error: "No se pudo agendar la sesión." };
  await syncCalendar(data.id);
  await audit("agendar_sesion", "sessions", data.id);
  revalidatePath(`/pacientes/${patientId}`);
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
  return { ok: true };
}

export async function saveSessionNote(sessionId: string, patientId: string, _: FormState, f: FormData): Promise<FormState> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("sessions").update({
    symptoms_enc: encrypt(str(f, "symptoms")),
    intervention_enc: encrypt(str(f, "intervention")),
    next_tasks_enc: encrypt(str(f, "next_tasks")),
    status: "realizada" as SessionStatus,
  }).eq("id", sessionId);
  if (error) return { error: "No se pudo guardar la nota." };
  await audit("editar_nota_sesion", "sessions", sessionId);
  revalidatePath(`/pacientes/${patientId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setSessionStatus(sessionId: string, patientId: string, status: SessionStatus) {
  const { supabase } = await ctx();
  const { data: s } = await supabase.from("sessions").select("google_event_id").eq("id", sessionId).single();
  await supabase.from("sessions").update({ status, ...(status === "cancelada" ? { google_event_id: null } : {}) }).eq("id", sessionId);
  if (status === "cancelada") await deleteEvent(s?.google_event_id ?? null);
  await audit(`sesion_${status}`, "sessions", sessionId);
  revalidatePath(`/pacientes/${patientId}`);
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
}

/* ---------------- Notas rápidas e hitos ---------------- */

export async function addQuickNote(_: FormState, f: FormData): Promise<FormState> {
  const { supabase } = await ctx();
  const body = str(f, "body");
  if (!body) return { error: "Escriba la nota." };
  const { error } = await supabase.from("quick_notes").insert({ body_enc: encrypt(body), patient_id: orNull(str(f, "patient_id")) });
  if (error) return { error: "No se pudo guardar." };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function processQuickNote(id: string) {
  const { supabase } = await ctx();
  await supabase.from("quick_notes").update({ processed: true }).eq("id", id);
  revalidatePath("/dashboard");
}

export async function addMilestone(patientId: string, _: FormState, f: FormData): Promise<FormState> {
  const { supabase } = await ctx();
  const title = str(f, "title");
  const due = str(f, "due_date");
  if (!title || !due) return { error: "Indique el hito y la fecha." };
  const { error } = await supabase.from("milestones").insert({ patient_id: patientId, title_enc: encrypt(title), due_date: due });
  if (error) return { error: "No se pudo guardar el hito." };
  revalidatePath(`/pacientes/${patientId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function completeMilestone(id: string, patientId: string) {
  const { supabase } = await ctx();
  await supabase.from("milestones").update({ done: true }).eq("id", id);
  revalidatePath(`/pacientes/${patientId}`);
  revalidatePath("/dashboard");
}

export async function logPatientView(patientId: string) {
  await audit("ver_ficha", "patients", patientId);
}
