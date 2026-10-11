import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL, type PatientStatus } from "@/lib/types";
import { ageFrom, fmtDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

const ESTADOS: (PatientStatus | "todos")[] = ["todos", "activo", "en_pausa", "alta"];

export default async function Pacientes({ searchParams }: { searchParams: { q?: string; estado?: string; riesgo?: string } }) {
  const supabase = createClient();
  const estado = ESTADOS.includes(searchParams.estado as PatientStatus) ? (searchParams.estado as PatientStatus) : "todos";
  const q = (searchParams.q ?? "").trim().replace(/[%,()]/g, "");

  let query = supabase.from("patients").select("id,full_name,birth_date,status,risk_high,phone")
    .order("risk_high", { ascending: false }).order("full_name");
  if (estado !== "todos") query = query.eq("status", estado);
  if (searchParams.riesgo === "1") query = query.eq("risk_high", true);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);

  const { data: patients } = await query;
  const ids = (patients ?? []).map((p) => p.id);
  const { data: last } = ids.length
    ? await supabase.from("sessions").select("patient_id,scheduled_at").eq("status", "realizada").in("patient_id", ids).order("scheduled_at", { ascending: false })
    : { data: [] };
  const lastBy = new Map<string, string>();
  for (const s of last ?? []) if (!lastBy.has(s.patient_id)) lastBy.set(s.patient_id, s.scheduled_at);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1>Pacientes</h1>
        <Link href="/pacientes/nuevo" className="btn-primary">+ Nuevo paciente</Link>
      </div>

      <form className="card flex flex-wrap items-end gap-3" role="search">
        <div className="min-w-[14rem] flex-1">
          <label className="label" htmlFor="q">Buscar</label>
          <input id="q" name="q" defaultValue={q} placeholder="Nombre, correo o teléfono" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="estado">Estado</label>
          <select id="estado" name="estado" defaultValue={estado} className="input">
            {ESTADOS.map((e) => <option key={e} value={e}>{e === "todos" ? "Todos" : STATUS_LABEL[e]}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="riesgo" value="1" defaultChecked={searchParams.riesgo === "1"} /> Solo riesgo alto
        </label>
        <button className="btn-soft">Filtrar</button>
      </form>

      <ul className="space-y-2">
        {(patients ?? []).map((p) => (
          <li key={p.id}>
            <Link
              href={`/pacientes/${p.id}`}
              className={`flex items-center gap-4 rounded-xl2 border p-4 shadow-suave transition hover:-translate-y-px ${
                p.risk_high ? "border-riesgo-500 bg-riesgo-50" : "border-salvia-100 bg-white"
              }`}
            >
              <span className={`h-10 w-1.5 rounded-full ${p.risk_high ? "bg-riesgo-600" : "bg-salvia-200"}`} aria-hidden />
              <span className="flex-1">
                <span className="font-medium">{p.full_name}</span>
                {p.risk_high && <span className="chip ml-2 bg-riesgo-600 text-white">⚠ RIESGO ALTO</span>}
                <span className="block text-sm text-tinta-suave">
                  {ageFrom(p.birth_date) !== null ? `${ageFrom(p.birth_date)} años · ` : ""}
                  Última sesión: {lastBy.has(p.id) ? fmtDate(lastBy.get(p.id)!) : "—"}
                </span>
              </span>
              <span className="chip bg-salvia-100 text-salvia-700">{STATUS_LABEL[p.status as PatientStatus]}</span>
            </Link>
          </li>
        ))}
        {(patients ?? []).length === 0 && <li className="card text-sm text-tinta-suave">No se encontraron pacientes.</li>}
      </ul>
    </div>
  );
}
