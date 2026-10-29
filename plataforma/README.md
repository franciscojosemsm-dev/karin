# Plataforma Karin · Ruiz & Morales

Canal de denuncias y reloj de plazos de la Ley 21.643 para empresas (motor 2 del Sistema Piloto Automático).

## Qué hace
- **Canal de denuncias por empresa** (`/d/:slug`), con enlace, código QR y afiche. Pide el contenido mínimo del DS 21/2024, art. 11, entrega comprobante con folio, fecha y hora, y un código y clave para el seguimiento (`/seguimiento`).
- **Panel de la empresa** (`/panel`): lista de denuncias ordenada por urgencia, registro de denuncias verbales o escritas, ficha con identidad reservada, mensajes con quien denuncia y bitácora.
- **Reloj de plazos** en días hábiles con feriados nacionales calculados por reglas legales (`src/lib/feriados.ts`, `src/lib/plazos.ts`) y días inhábiles adicionales por empresa. Exporta los plazos a un calendario (.ics).
- **Avisos por correo** (`netlify/functions/avisos.mts`), activos solo si se configuran `SUPABASE_SERVICE_ROLE_KEY` y `RESEND_API_KEY` en Netlify.

## Datos y seguridad
- Base de datos en Supabase (proyecto `plataforma-karin`, región sa-east-1). Esquema y reglas por fila en `../supabase/migrations/`.
- Cada empresa ve solo sus denuncias. La identidad se guarda en una tabla aparte, visible solo para miembros con permiso.
- El público solo puede crear una denuncia y consultarla con código y clave, mediante funciones de la base.

## Desarrollo
```
npm install
npm test        # cálculo de feriados y plazos
npm run build
```
