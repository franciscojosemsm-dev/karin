"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, className = "btn-primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Guardando…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: { ok?: boolean; error?: string } }) {
  if (state.error) return <p role="alert" className="text-sm text-riesgo-600">{state.error}</p>;
  if (state.ok) return <p role="status" className="text-sm text-salvia-700">Guardado ✓</p>;
  return null;
}
