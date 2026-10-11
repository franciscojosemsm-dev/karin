"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MINUTES = Number(process.env.NEXT_PUBLIC_IDLE_MINUTES ?? 15);
const WARN_SECONDS = 60;
const EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

/** Cierra la sesión tras MINUTES de inactividad (aviso previo de 60 s). */
export function IdleTimeout() {
  const [left, setLeft] = useState<number | null>(null);
  const last = useRef(Date.now());

  const logout = useCallback(async () => {
    await createClient().auth.signOut();
    window.location.href = "/login?motivo=inactividad";
  }, []);

  useEffect(() => {
    const bump = () => { if (left === null) last.current = Date.now(); };
    EVENTS.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const tick = setInterval(() => {
      const remaining = MINUTES * 60 - Math.floor((Date.now() - last.current) / 1000);
      if (remaining <= 0) void logout();
      else setLeft(remaining <= WARN_SECONDS ? remaining : null);
    }, 1000);
    return () => { EVENTS.forEach((e) => window.removeEventListener(e, bump)); clearInterval(tick); };
  }, [left, logout]);

  if (left === null) return null;
  return (
    <div role="alertdialog" aria-live="assertive" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-xl2 border border-lavanda-200 bg-lavanda-50 p-4 shadow-suave">
      <p className="text-sm">Por seguridad, la sesión se cerrará en <strong>{left} s</strong> por inactividad.</p>
      <button className="btn-primary mt-3" onClick={() => { last.current = Date.now(); setLeft(null); }}>Continuar conectada</button>
    </div>
  );
}
