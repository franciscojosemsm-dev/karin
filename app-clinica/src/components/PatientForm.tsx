"use client";
import { useFormState } from "react-dom";
import type { FormState } from "@/app/(app)/actions";
import { SubmitButton, FormMessage } from "./SubmitButton";

export interface PatientFormValues {
  full_name: string; birth_date: string; email: string; phone: string;
  status: string; reason: string; history: string; followup_days: string;
}
const empty: PatientFormValues = { full_name: "", birth_date: "", email: "", phone: "", status: "activo", reason: "", history: "", followup_days: "" };

export function PatientForm({
  action, values = empty, submitLabel,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  values?: PatientFormValues;
  submitLabel: string;
}) {
  const [state, run] = useFormState<FormState, FormData>(action, {});
  return (
    <form action={run} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="full_name">Nombre completo *</label>
          <input id="full_name" name="full_name" required defaultValue={values.full_name} className="input" autoComplete="off" />
        </div>
        <div>
          <label className="label" htmlFor="birth_date">Fecha de nacimiento</label>
          <input id="birth_date" name="birth_date" type="date" defaultValue={values.birth_date} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="status">Estado</label>
          <select id="status" name="status" defaultValue={values.status} className="input">
            <option value="activo">Activo</option><option value="en_pausa">En pausa</option><option value="alta">Alta</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="email">Correo</label>
          <input id="email" name="email" type="email" defaultValue={values.email} className="input" autoComplete="off" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Teléfono</label>
          <input id="phone" name="phone" type="tel" defaultValue={values.phone} className="input" autoComplete="off" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="reason">Motivo de consulta</label>
        <textarea id="reason" name="reason" rows={3} defaultValue={values.reason} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="history">Antecedentes relevantes</label>
        <textarea id="history" name="history" rows={3} defaultValue={values.history} className="input" />
      </div>
      <div className="max-w-xs">
        <label className="label" htmlFor="followup_days">Alerta si pasan más de … días sin sesión</label>
        <input id="followup_days" name="followup_days" type="number" min={1} max={365} defaultValue={values.followup_days} placeholder="Sin alerta" className="input" />
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton>{submitLabel}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
