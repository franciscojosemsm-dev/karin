"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "loading" | "verify" | "enroll" | "enrolled";

/** Verificación (o activación) del segundo factor TOTP — Google Authenticator, Authy, etc. */
export default function MfaPage() {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("loading");
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp.find((f) => f.status === "verified");
      if (verified) {
        setFactorId(verified.id);
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        setMode(aal?.currentLevel === "aal2" ? "enrolled" : "verify");
      } else {
        setMode("enroll");
      }
    })();
  }, [supabase]);

  async function startEnroll() {
    setError(null);
    // Limpia intentos previos sin verificar
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Agenda Clínica" });
    if (error || !data) return setError("No se pudo iniciar la activación.");
    setFactorId(data.id); setQr(data.totp.qr_code); setSecret(data.totp.secret);
  }

  async function verify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null);
    const code = String(new FormData(e.currentTarget).get("code")).trim();
    const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId });
    if (e1 || !ch) return setError("No se pudo generar el desafío.");
    const { error: e2 } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
    if (e2) return setError("Código incorrecto.");
    router.replace("/dashboard"); router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-lavanda-50 via-bruma to-salvia-50 px-4">
      <div className="card w-full max-w-sm space-y-4">
        <h1 className="text-center">Verificación en dos pasos</h1>
        {mode === "loading" && <p className="text-center text-sm text-tinta-suave">Cargando…</p>}
        {mode === "enrolled" && <p className="text-sm">La verificación en dos pasos ya está activa en su cuenta. ✓</p>}
        {mode === "enroll" && !qr && (
          <>
            <p className="text-sm text-tinta-suave">Active un segundo factor con una app autenticadora para proteger los expedientes.</p>
            <button className="btn-primary w-full" onClick={startEnroll}>Activar ahora</button>
            <button className="btn-ghost w-full" onClick={() => router.push("/dashboard")}>Más tarde</button>
          </>
        )}
        {(mode === "verify" || (mode === "enroll" && qr)) && (
          <form onSubmit={verify} className="space-y-3">
            {qr && (
              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="Código QR para la app autenticadora" className="mx-auto h-40 w-40" />
                <p className="mt-1 break-all text-xs text-tinta-tenue">Clave manual: {secret}</p>
              </div>
            )}
            <label className="label" htmlFor="code">Código de 6 dígitos</label>
            <input id="code" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="one-time-code" className="input text-center text-lg tracking-widest" />
            <button className="btn-primary w-full">Verificar</button>
          </form>
        )}
        {error && <p role="alert" className="text-sm text-riesgo-600">{error}</p>}
      </div>
    </main>
  );
}
