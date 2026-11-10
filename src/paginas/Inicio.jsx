
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

import Hero from "../componentes/Hero";
import PeliculaCard from "../componentes/PeliculaCard";
import Promociones from "../componentes/Promociones";
import "../estilos/inicio.css";

function Inicio() {
  const [peliculas, setPeliculas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cancelar = onSnapshot(
      collection(db, "peliculas"),
      (resultado) => {
        const peliculasFirestore = resultado.docs.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));

        setPeliculas(peliculasFirestore);
        setCargando(false);
        setError("");
      },
      (error) => {
        console.error("Error al cargar películas:", error);
        setError("No se pudieron cargar las películas.");
        setCargando(false);
      }
    );

    return () => cancelar();
  }, []);

  return (
    <div className="pagina-inicio">
      <Hero />

      <section className="section-container" id="cartelera">
        <h2 className="section-title">En Cartelera & Estrenos</h2>

        {cargando && <p>Cargando películas...</p>}

        {error && <p>{error}</p>}

        {!cargando && !error && peliculas.length === 0 && (
          <p>Todavía no hay películas cargadas en la cartelera.</p>
        )}

        <div className="movies-grid">
          {peliculas.map((pelicula) => (
            <PeliculaCard
              key={pelicula.id}
              pelicula={{
                ...pelicula,
                horarios: Array.isArray(pelicula.horarios)
                  ? pelicula.horarios
                  : [],
              }}
            />
          ))}
        </div>
      </section>

      <Promociones />
    </div>
  );
}

export default Inicio;
