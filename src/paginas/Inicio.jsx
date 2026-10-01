import { useState } from "react";
import Hero from "../componentes/Hero";
import PeliculaCard from "../componentes/PeliculaCard";
import Promociones from "../componentes/Promociones";
import ModalTicket from "../componentes/ModalTicket";
import { peliculas } from "../datos/peliculas";
import "../estilos/inicio.css";

function Inicio() {
  const [seleccionada, setSeleccionada] = useState(null);

  return (
    <div className="pagina-inicio">
      <Hero />

      <section className="section-container" id="cartelera">
        <h2 className="section-title">En Cartelera & Estrenos</h2>
        <div className="movies-grid">
          {peliculas.map((p) => (
            <PeliculaCard key={p.id} pelicula={p} onComprar={setSeleccionada} />
          ))}
        </div>
      </section>

      <Promociones />

      {seleccionada && (
        <ModalTicket
          pelicula={seleccionada}
          onCerrar={() => setSeleccionada(null)}
        />
      )}
    </div>
  );
}

export default Inicio;
