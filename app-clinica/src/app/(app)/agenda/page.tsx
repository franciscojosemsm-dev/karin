import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addDays, fmtDateLong, fmtTime, startOfDay } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Agenda() {
  const supabase = createClient();
  const from = startOfDay(new Date());
  const { data } = await supabase
    .from("sessions").select("id,scheduled_at,duration_min,patient_id,patients(full_name,risk_high)")
    .eq("status", "programada").gte("scheduled_at", from.toISOString()).lt("scheduled_at", addDays(from, 30).toISOString())
    .order("scheduled_at");

  const groups = new Map<string, typeof data>();
  for (const s of data ?? []) {
    const k = fmtDateLong(s.scheduled_at);
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }

  return (
    <div className="space-y-5">
      <h1>Agenda · próximos 30 días</h1>
      {groups.size === 0 && <p className="card text-sm text-tinta-suave">No hay sesiones programadas.</p>}
      {[...groups.entries()].map(([day, list]) => (
        <section key={day} className="card">
          <h2 className="mb-2 capitalize">{day}</h2>
          <ul className="divide-y divide-salvia-100">
            {list!.map((s) => {
              const p = s.patients as unknown as { full_name: string; risk_high: boolean } | null;
              return (
                <li key={s.id}>
                  <Link href={`/pacientes/${s.patient_id}`} className="flex gap-4 py-2 hover:bg-salvia-50">
                    <span className="w-14 tabular-nums text-salvia-700">{fmtTime(s.scheduled_at)}</span>
                    <span className="flex-1">{p?.full_name}{p?.risk_high && <span className="chip ml-2 bg-riesgo-100 text-riesgo-700">Riesgo alto</span>}</span>
                    <span className="text-sm text-tinta-tenue">{s.duration_min} min</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
