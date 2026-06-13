import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { FundamentosPage }  from "./pages/FundamentosPage";
import { ExperimentosPage } from "./pages/ExperimentosPage";
import { RLMemoriaPage }    from "./pages/ArquitectoPage";
import { RLAtencionPage }   from "./pages/RLAtencionPage";
import { ReasoningPage }    from "./pages/ReasoningPage";

function Layout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/clasificacion-2d" replace />} />
        <Route path="clasificacion-2d"      element={<FundamentosPage />} />
        <Route path="rl-feedforward"        element={<ExperimentosPage />} />
        <Route path="rl-memoria"            element={<RLMemoriaPage />} />
        <Route path="rl-atencion"           element={<RLAtencionPage />} />
        <Route path="razonamiento"          element={<ReasoningPage />} />
        <Route path="*"                     element={<Navigate to="/clasificacion-2d" replace />} />
      </Route>
    </Routes>
  );
}
