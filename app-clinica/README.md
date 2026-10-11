# Agenda Clínica

Aplicación web (responsive, instalable en el móvil) para una psicóloga clínica: pacientes, sesiones, notas clave, alertas de riesgo/seguimiento y recordatorios sincronizados con Google Calendar.

**Stack:** Next.js 14 (App Router) · Tailwind CSS · Supabase (Postgres + Auth + RLS) · Google Calendar API · Resend · Vercel Cron.

## Estructura

```
app-clinica/
├─ supabase/migrations/0001_schema.sql   # tablas, enums, RLS, auditoría
├─ vercel.json                           # cron diario 11:00 UTC
└─ src/
   ├─ middleware.ts                      # exige login y MFA (aal2) si está activado
   ├─ lib/
   │  ├─ crypto.ts                       # AES-256-GCM para campos clínicos
   │  ├─ alerts.ts                       # reglas de alertas (riesgo, seguimiento, tareas, cumpleaños, hitos)
   │  ├─ google-calendar.ts              # crea/actualiza/borra eventos con recordatorio 2 días antes
   │  ├─ dates.ts                        # zona horaria America/Santiago
   │  └─ supabase/{server,client,admin,middleware}.ts
   ├─ components/                        # RiskSwitch, KeyNotesForm, SessionNoteForm, AlertsPanel, IdleTimeout…
   └─ app/
      ├─ login, mfa
      ├─ (app)/dashboard, pacientes, pacientes/[id], agenda, actions.ts (server actions)
      └─ api/cron/daily, api/calendar/[token]   # recordatorios por correo y feed .ics
```

## Puesta en marcha

1. Crear un proyecto en Supabase y ejecutar `supabase/migrations/0001_schema.sql` en el SQL Editor.
2. En *Authentication → Providers*, dejar solo Email, **desactivar el registro público** (Sign ups) y crear manualmente el usuario de la psicóloga. Activar MFA (TOTP) en *Authentication → Multi-Factor*.
3. `cp .env.example .env.local` y completar valores. Clave de cifrado: `openssl rand -base64 32`.
4. `npm install && npm run dev`.
5. Desplegar en Vercel con las mismas variables; el cron diario ya está en `vercel.json` (definir `CRON_SECRET`).

## Recordatorio 2 días antes + Google Calendar (ps.rominapazrr@gmail.com)

Al agendar una sesión la app crea un evento en ese calendario con avisos **por correo y notificación 2 días antes** (y 1 hora antes). Al cancelar, lo elimina. Para habilitarlo (una sola vez):

1. En Google Cloud Console: crear proyecto → habilitar *Google Calendar API* → crear credenciales *OAuth client ID* (tipo Web) → anotar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
2. En [OAuth Playground](https://developers.google.com/oauthplayground) (⚙ → «Use your own OAuth credentials»), autorizar el scope `https://www.googleapis.com/auth/calendar.events` **iniciando sesión como ps.rominapazrr@gmail.com** y copiar el *refresh token* a `GOOGLE_REFRESH_TOKEN`.
3. `GOOGLE_CALENDAR_ID=ps.rominapazrr@gmail.com`.

Además, el cron diario envía un correo (Resend) a `REMINDER_TO` con las sesiones que ocurren dentro de 2 días y las alertas urgentes. Alternativa: el feed `https://TU-APP/api/calendar/<ics_token>` (token en la tabla `profiles`) para suscribirse desde Apple/Outlook; Google ignora las alarmas de feeds suscritos, por eso se usa la API directa.

Si las variables de Google no están definidas, la app funciona igual y simplemente omite la sincronización.

## Seguridad y cumplimiento (HIPAA / RGPD)

| Medida | Implementación |
|---|---|
| Autenticación | Supabase Auth (email + contraseña) y TOTP opcional; el middleware exige aal2 si está activado |
| Cifrado en tránsito | HTTPS + HSTS (`next.config.mjs`) |
| Cifrado en reposo | Cifrado de disco de Supabase **y** cifrado de aplicación AES-256-GCM de todo texto clínico libre (motivo, antecedentes, notas clave, notas de sesión, motivo de riesgo, notas rápidas, hitos). La clave nunca llega al navegador |
| Aislamiento | RLS en todas las tablas (`owner_id = auth.uid()`) |
| Inactividad | Cierre automático a los 15 min (`NEXT_PUBLIC_IDLE_MINUTES`) con aviso de 60 s |
| Auditoría | `audit_log` de solo inserción: accesos a fichas, ediciones, marcas de riesgo |
| Minimización | Google Calendar y correos solo llevan iniciales y hora, sin datos clínicos |

**Límites que conviene conocer:** nombre, correo, teléfono y estado quedan en claro para poder buscar y filtrar (protegidos por RLS y cifrado de disco). La pérdida de `ENCRYPTION_KEY` hace irrecuperables las notas: respáldela en un gestor de secretos. Cumplir HIPAA/RGPD exige además medidas organizativas (BAA/DPA con Supabase y Vercel, política de privacidad, consentimiento informado, plan de retención y respuesta a brechas) que este código no sustituye; conviene validarlas con asesoría legal y con el Código de Ética del Colegio de Psicólogos.

## Reglas de alertas (`src/lib/alerts.ts`)

- **Riesgo:** paciente activo con «Riesgo alto» → destacado en rojo en lista, agenda y panel.
- **Seguimiento:** sin cita futura y más de `followup_days` desde la última sesión realizada (7 días por defecto si es riesgo alto).
- **Tarea/control:** la última sesión dejó tareas y pasaron 5 días sin cita.
- **Cumpleaños e hitos:** aviso desde 7 días antes.
