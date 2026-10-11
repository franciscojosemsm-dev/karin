import Link from "next/link";
import type { AlertItem } from "@/lib/alerts";

const STYLE = {
  alta:  "border-riesgo-100 bg-riesgo-50",
  media: "border-arena-200 bg-arena-50",
  baja:  "border-salvia-100 bg-salvia-50",
} as const;
const ICON = { riesgo: "⚠", seguimiento: "⏱", tarea_control: "✉", cumpleanos: "🎂", hito: "◆" } as const;

export function AlertsPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <section className="card" aria-labelledby="alerts-h">
      <h2 id="alerts-h" className="mb-3">Alertas activas <span className="chip bg-riesgo-100 text-riesgo-700">{alerts.length}</span></h2>
      {alerts.length === 0 ? (
        <p className="text-sm text-tinta-suave">Todo en calma. No hay alertas pendientes.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.key}>
              <Link href={`/pacientes/${a.patientId}`} className={`flex items-start gap-3 rounded-xl border p-3 transition hover:shadow-suave ${STYLE[a.severity]}`}>
                <span aria-hidden className="mt-0.5">{ICON[a.kind]}</span>
                <span>
                  <span className="block font-medium">{a.patientName}</span>
                  <span className="block text-sm text-tinta-suave">{a.message}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
