import Link from "next/link";
import { IdleTimeout } from "@/components/IdleTimeout";
import { signOut } from "./actions";

const NAV = [
  { href: "/dashboard", label: "Panel" },
  { href: "/pacientes", label: "Pacientes" },
  { href: "/agenda", label: "Agenda" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-salvia-100 bg-bruma/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/dashboard" className="font-semibold text-salvia-700">Agenda Clínica</Link>
          <nav className="flex items-center gap-1 text-sm" aria-label="Principal">
            {NAV.map((n) => <Link key={n.href} href={n.href} className="btn-ghost">{n.label}</Link>)}
            <Link href="/mfa" className="btn-ghost" title="Verificación en dos pasos">🔒</Link>
            <form action={signOut}><button className="btn-ghost">Salir</button></form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <IdleTimeout />
    </>
  );
}
