// ................................ Pantallas candy y planes, no borrar, si se puede agregar para sus pantallas.
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./componentes/Navbar";
import Footer from "./componentes/Footer";
import Inicio from "./paginas/Inicio";
import Planes from "./paginas/Planes";
import Candy from "./paginas/Candy";

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
        <Route path="/" element={<Inicio />} />
        <Route path="/planes" element={<Planes />} />
        <Route path="/candy" element={<Candy />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
//.............................