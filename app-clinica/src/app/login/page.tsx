"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const f = new FormData(e.currentTarget);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(f.get("email")), password: String(f.get("password")),
    });
    setBusy(false);
    if (error) return setError("Credenciales inválidas. Verifique sus datos.");
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-salvia-50 via-bruma to-lavanda-50 px-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1>Agenda Clínica</h1>
          <p className="text-sm text-tinta-suave">Acceso privado y cifrado</p>
        </div>
        {params.get("motivo") === "inactividad" && (
          <p role="status" className="rounded-xl bg-lavanda-50 p-3 text-sm text-lavanda-600">
            La sesión se cerró por inactividad.
          </p>
        )}
        <div>
          <label className="label" htmlFor="email">Correo</label>
          <input id="email" name="email" type="email" required autoComplete="username" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
        </div>
        {error && <p role="alert" className="text-sm text-riesgo-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
