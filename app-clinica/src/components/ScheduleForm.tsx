"use client";
import { useFormState } from "react-dom";
import { scheduleSession, type FormState } from "@/app/(app)/actions";
import { SubmitButton, FormMessage } from "./SubmitButton";

export function ScheduleForm({ patientId }: { patientId: string }) {
  const [state, action] = useFormState<FormState, FormData>(scheduleSession.bind(null, patientId), {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="label" htmlFor="sched">Fecha y hora</label>
        <input id="sched" name="scheduled_at" type="datetime-local" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="dur">Duración (min)</label>
        <input id="dur" name="duration_min" type="number" min={10} max={240} step={5} defaultValue={50} className="input w-28" />
      </div>
      <SubmitButton>Agendar</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
