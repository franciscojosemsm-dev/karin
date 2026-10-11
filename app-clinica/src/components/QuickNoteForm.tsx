"use client";
import { useFormState } from "react-dom";
import { useEffect, useRef } from "react";
import { addQuickNote, type FormState } from "@/app/(app)/actions";
import { SubmitButton, FormMessage } from "./SubmitButton";

export function QuickNoteForm({ patients }: { patients: { id: string; full_name: string }[] }) {
  const [state, action] = useFormState<FormState, FormData>(addQuickNote, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <textarea name="body" rows={2} required placeholder="Nota rápida para procesar después…" className="input" aria-label="Nota rápida" />
      <div className="flex items-center gap-2">
        <select name="patient_id" className="input" aria-label="Paciente (opcional)" defaultValue="">
          <option value="">Sin paciente</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
        <SubmitButton className="btn-soft shrink-0">Guardar</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
