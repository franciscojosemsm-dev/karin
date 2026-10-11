import "server-only";
import { TZ } from "./dates";

/**
 * Sincronización con Google Calendar (calendario de ps.rominapazrr@gmail.com).
 * Usa un refresh token OAuth guardado en variables de entorno (ver README).
 * Privacidad: el evento usa solo iniciales del paciente, nunca datos clínicos.
 * Recordatorios: aviso por correo y notificación 2 días antes (+ 1 hora antes).
 */
const CAL = () => encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || "primary");

export const googleConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);

async function accessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google OAuth: ${res.status}`);
  return (await res.json()).access_token;
}

export interface CalSession {
  id: string;
  scheduledAt: string;
  durationMin: number;
  label: string; // iniciales
  reminderDays: number;
}

function body(s: CalSession) {
  const start = new Date(s.scheduledAt);
  const end = new Date(start.getTime() + s.durationMin * 60_000);
  const mins = s.reminderDays * 1440;
  return {
    summary: `Sesión · ${s.label}`,
    description: "Sesión clínica. Detalles en la Agenda Clínica (no se incluyen datos del paciente).",
    start: { dateTime: start.toISOString(), timeZone: TZ },
    end: { dateTime: end.toISOString(), timeZone: TZ },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: mins },
        { method: "popup", minutes: mins },
        { method: "popup", minutes: 60 },
      ],
    },
    extendedProperties: { private: { clinicSessionId: s.id } },
  };
}

/** Crea o actualiza el evento. Devuelve el id de Google (o null si no está configurado / falla). */
export async function upsertEvent(s: CalSession, existingId?: string | null): Promise<string | null> {
  if (!googleConfigured()) return null;
  try {
    const token = await accessToken();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${CAL()}/events${existingId ? `/${existingId}` : ""}?sendUpdates=none`;
    const res = await fetch(url, {
      method: existingId ? "PATCH" : "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body(s)),
    });
    if (!res.ok) throw new Error(`Calendar ${res.status}: ${await res.text()}`);
    return (await res.json()).id as string;
  } catch (e) {
    console.error("[google-calendar] upsert falló:", e instanceof Error ? e.message : e);
    return existingId ?? null;
  }
}

export async function deleteEvent(eventId: string | null): Promise<void> {
  if (!googleConfigured() || !eventId) return;
  try {
    const token = await accessToken();
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${CAL()}/events/${eventId}?sendUpdates=none`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 404 && res.status !== 410) throw new Error(`Calendar ${res.status}`);
  } catch (e) {
    console.error("[google-calendar] delete falló:", e instanceof Error ? e.message : e);
  }
}
