import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ProveedorSesion, useSesion } from './lib/sesion';
import Encabezado from './componentes/Encabezado';
import Pie from './componentes/Pie';
import Inicio from './paginas/Inicio';
import Ingresar from './paginas/Ingresar';
import NuevaClave from './paginas/NuevaClave';
import Panel from './paginas/Panel';
import DenunciaDetalle from './paginas/DenunciaDetalle';
import RegistrarDenuncia from './paginas/RegistrarDenuncia';
import Afiche from './paginas/Afiche';
import Canal from './paginas/Canal';
import Seguimiento from './paginas/Seguimiento';
import Privacidad from './paginas/Privacidad';
import Mesa from './paginas/Mesa';
import Expediente from './paginas/Expediente';
import { Acta, Informe } from './paginas/Documentos';
import { ProveedorBoveda } from './lib/boveda';

function Privada({ children }: { children: ReactNode }) {
  const { sesion, cargando } = useSesion();
  if (cargando) return <main className="p-10 text-suave">Cargando…</main>;
  return sesion ? <>{children}</> : <Navigate to="/ingresar" replace />;
}

export default function App() {
  return (
    <ProveedorSesion>
      <ProveedorBoveda>
      <BrowserRouter>
        <Encabezado />
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/ingresar" element={<Ingresar />} />
          <Route path="/clave" element={<NuevaClave />} />
          <Route path="/d/:slug" element={<Canal />} />
          <Route path="/seguimiento" element={<Seguimiento />} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="/panel" element={<Privada><Panel /></Privada>} />
          <Route path="/panel/registrar" element={<Privada><RegistrarDenuncia /></Privada>} />
          <Route path="/panel/afiche" element={<Privada><Afiche /></Privada>} />
          <Route path="/panel/denuncia/:id" element={<Privada><DenunciaDetalle /></Privada>} />
          <Route path="/mesa" element={<Privada><Mesa /></Privada>} />
          <Route path="/mesa/expediente/:id" element={<Privada><Expediente /></Privada>} />
          <Route path="/mesa/expediente/:id/acta/:eid" element={<Privada><Acta /></Privada>} />
          <Route path="/mesa/expediente/:id/informe" element={<Privada><Informe /></Privada>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Pie />
      </BrowserRouter>
      </ProveedorBoveda>
    </ProveedorSesion>
  );
}
