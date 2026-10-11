"use client";
import { useFormState } from "react-dom";
import { saveKeyNotes, type FormState } from "@/app/(app)/actions";
import { SubmitButton, FormMessage } from "./SubmitButton";

/** Notas clave: lo que debe recordarse al instante antes de cada sesión. */
export function KeyNotesForm({ patientId, value }: { patientId: string; value: string }) {
  const [state, action] = useFormState<FormState, FormData>(saveKeyNotes.bind(null, patientId), {});
  return (
    <form action={action} className="rounded-xl2 border border-lavanda-200 bg-lavanda-50 p-5 shadow-suave">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lavanda-600">★ Notas clave · antes de la sesión</h2>
        <FormMessage state={state} />
      </div>
      <textarea
        name="key_notes" defaultValue={value} rows={6} aria-label="Notas clave"
        placeholder={"• Familiares conflictivos (nombres)\n• Detonantes específicos\n• Hitos avanzados\n• Qué NO decir / cómo abordar"}
        className="input bg-white/80 text-[15px]"
      />
      <div className="mt-3 flex justify-end"><SubmitButton>Guardar notas clave</SubmitButton></div>
    </form>
  );
}
