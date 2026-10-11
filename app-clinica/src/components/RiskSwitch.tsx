"use client";
import { useState, useTransition } from "react";
import { setRisk } from "@/app/(app)/actions";

/** Interruptor llamativo de RIESGO ALTO. Al activarlo pide un motivo breve (cifrado). */
export function RiskSwitch({ patientId, initial, note }: { patientId: string; initial: boolean; note: string }) {
  const [high, setHigh] = useState(initial);
  const [asking, setAsking] = useState(false);
  const [text, setText] = useState(note);
  const [pending, start] = useTransition();

  const commit = (value: boolean) =>
    start(async () => {
      await setRisk(patientId, value, text);
      setHigh(value);
      setAsking(false);
    });

  return (
    <div className={`rounded-xl2 border-2 p-4 transition ${high ? "border-riesgo-500 bg-riesgo-50" : "border-salvia-100 bg-white"}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className={`font-semibold ${high ? "text-riesgo-700" : "text-tinta"}`}>
            {high ? "⚠ RIESGO ALTO ACTIVO" : "Riesgo alto"}
          </p>
          <p className="text-sm text-tinta-suave">Ideación, crisis u otra urgencia clínica.</p>
        </div>
        <button
          type="button" role="switch" aria-checked={high} aria-label="Marcar riesgo alto" disabled={pending}
          onClick={() => (high ? commit(false) : setAsking(true))}
          className={`relative h-8 w-14 shrink-0 rounded-full transition ${high ? "bg-riesgo-600" : "bg-salvia-200"}`}
        >
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${high ? "left-7" : "left-1"}`} />
        </button>
      </div>

      {(asking || high) && (
        <div className="mt-3">
          <label className="label" htmlFor="risk-note">Motivo / plan de contención (cifrado)</label>
          <textarea id="risk-note" className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="mt-2 flex gap-2">
            {asking && <button className="btn bg-riesgo-600 text-white hover:bg-riesgo-700" disabled={pending} onClick={() => commit(true)}>Confirmar riesgo alto</button>}
            {asking && <button className="btn-ghost" onClick={() => setAsking(false)}>Cancelar</button>}
            {high && !asking && <button className="btn-soft" disabled={pending} onClick={() => commit(true)}>Actualizar motivo</button>}
          </div>
        </div>
      )}
    </div>
  );
}
