import { PatientForm } from "@/components/PatientForm";
import { createPatient } from "../../actions";

export default function NuevoPaciente() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1>Nuevo expediente</h1>
      <div className="card"><PatientForm action={createPatient} submitLabel="Crear expediente" /></div>
    </div>
  );
}
