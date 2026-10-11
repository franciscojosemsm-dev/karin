"use client";
import { useFormState } from "react-dom";
import { saveSessionNote, type FormState } from "@/app/(app)/actions";
import { SubmitButton, FormMessage } from "./SubmitButton";

interface Props { sessionId: string; patientId: string; symptoms: string; intervention: string; nextTasks: string }

export function SessionNoteForm({ sessionId, patientId, symptoms, intervention, nextTasks }: Props) {
  const [state, action] = useFormState<FormState, FormData>(saveSessionNote.bind(null, sessionId, patientId), {});
  return (
    <form action={action} className="mt-3 space-y-3">
      <div>
        <label className="label" htmlFor={`s-${sessionId}`}>Síntomas reportados</label>
        <textarea id={`s-${sessionId}`} name="symptoms" rows={3} defaultValue={symptoms} className="input" />
      </div>
      <div>
        <label className="label" htmlFor={`i-${sessionId}`}>Intervención realizada</label>
        <textarea id={`i-${sessionId}`} name="intervention" rows={3} defaultValue={intervention} className="input" />
      </div>
      <div>
        <label className="label" htmlFor={`t-${sessionId}`}>Tareas / acuerdos para la próxima sesión</label>
        <textarea id={`t-${sessionId}`} name="next_tasks" rows={2} defaultValue={nextTasks} className="input" />
      </div>
      <div className="flex items-center justify-between">
        <FormMessage state={state} />
        <SubmitButton>Guardar nota de sesión</SubmitButton>
      </div>
    </form>
  );
}
