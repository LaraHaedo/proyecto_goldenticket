import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./componentes/Navbar";
import Footer from "./componentes/Footer";
import Planes from "./paginas/Planes";
import Candy from "./paginas/Candy";


 import Inicio from "./paginas/Inicio";

// Al cambiar de página, volvemos arriba de todo (NO TOCAR)
function ScrollArriba() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollArriba />
      <Navbar />
      <Routes>
        {/* ─────────────────────────────────────────────────────────
            AHORA: la ruta "/" redirige a Planes (mientras no hay Inicio).

            PASO 2 (cuando tengas Inicio.jsx):
              - BORRÁ la línea de abajo (la del Navigate)
              - y DESCOMENTÁ la línea del <Inicio /> que está después
            ───────────────────────────────────────────────────────── */}
        <Route path="/" element={< Inicio/>} />
        {/* <Route path="/" element={<Inicio />} /> */}

        {/* Estas dos NO se tocan */}
        <Route path="/planes" element={<Planes />} />
        <Route path="/candy" element={<Candy />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;