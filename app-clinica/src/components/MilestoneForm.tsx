"use client";
import { useFormState } from "react-dom";
import { addMilestone, type FormState } from "@/app/(app)/actions";
import { SubmitButton, FormMessage } from "./SubmitButton";

export function MilestoneForm({ patientId }: { patientId: string }) {
  const [state, action] = useFormState<FormState, FormData>(addMilestone.bind(null, patientId), {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[12rem] flex-1">
        <label className="label" htmlFor="ms-t">Hito terapéutico</label>
        <input id="ms-t" name="title" required placeholder="Ej.: 6 meses de proceso" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="ms-d">Fecha</label>
        <input id="ms-d" name="due_date" type="date" required className="input" />
      </div>
      <SubmitButton className="btn-soft">Añadir</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
