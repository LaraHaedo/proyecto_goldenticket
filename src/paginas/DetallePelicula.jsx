
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";

import { db } from "../firebase/config";
import "../estilos/pelicula.css";
import LoginRequiredModal from "../componentes/LoginRequiredModal";
import { estaLogueado, guardarPaginaRetorno } from "../utils/auth";

function DetallePelicula() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pelicula, setPelicula] = useState(null);
  const [funciones, setFunciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [loginModal, setLoginModal] = useState(false);

  useEffect(() => {
    async function cargarDatos() {
      try {
        setCargando(true);
        setError("");

        const referencia = doc(db, "peliculas", id);
        const resultado = await getDoc(referencia);

        if (!resultado.exists()) {
          setError("No se encontró esta película.");
          setPelicula(null);
          setFunciones([]);
          return;
        }

        const datosPelicula = {
          id: resultado.id,
          ...resultado.data()
        };

        setPelicula(datosPelicula);

        const consultaFunciones = query(
          collection(db, "horarios"),
          where("peliculaId", "==", id)
        );

        const resultadoFunciones = await getDocs(consultaFunciones);

        const funcionesCargadas = resultadoFunciones.docs.map((documento) => ({
          id: documento.id,
          ...documento.data()
        }));

        funcionesCargadas.sort((a, b) => {
          const fechaComparada = (a.fecha || "").localeCompare(b.fecha || "");
          return fechaComparada !== 0
            ? fechaComparada
            : (a.hora || "").localeCompare(b.hora || "");
        });

        setFunciones(funcionesCargadas);
      } catch (error) {
        console.error("Error al cargar la película:", error);
        setError("No se pudo cargar la información de la película.");
      } finally {
        setCargando(false);
      }
    }

    cargarDatos();
  }, [id]);

  function mostrarDuracion(duracion) {
    if (typeof duracion === "number") {
      const horas = Math.floor(duracion / 60);
      const minutos = duracion % 60;

      return horas > 0
        ? `${horas}h ${minutos > 0 ? `${minutos}m` : ""}`.trim()
        : `${minutos}m`;
    }

    return duracion || "";
  }

  function mostrarFecha(fecha) {
    if (!fecha) return "Fecha no disponible";

    const partes = fecha.split("-");

    if (partes.length !== 3) return fecha;

    const fechaLocal = new Date(
      Number(partes[0]),
      Number(partes[1]) - 1,
      Number(partes[2])
    );

    return fechaLocal.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  function seleccionarFuncion(funcion) {
    const seleccion = {
      funcionId: funcion.id,
      peliculaId: pelicula.id,
      pelicula: pelicula.titulo,
      dia: mostrarFecha(funcion.fecha),
      fecha: funcion.fecha,
      hora: funcion.hora,
      formato: "2D",
      sala: "Sala única",
      poster: pelicula.imagen,
      precio: funcion.precio,
      disponibles: funcion.disponibles
    };

    localStorage.setItem(
      "funcionSeleccionada",
      JSON.stringify(seleccion)
    );

    localStorage.removeItem("compraEnCurso");
    localStorage.removeItem("reservaVence");

    if (estaLogueado()) {
      navigate("/compra");
    } else {
      guardarPaginaRetorno("/compra");
      setLoginModal(true);
    }
  }

  if (cargando) {
    return <main className="pelicula-container"><p>Cargando película...</p></main>;
  }

  if (error || !pelicula) {
    return <main className="pelicula-container"><p>{error}</p></main>;
  }

  return (
    <>
      <main className="pelicula-container">
        <div className="pelicula">
          <div className="poster-container">
            <img
              src={pelicula.imagen}
              alt={pelicula.titulo}
              className="pelicula-poster"
            />
          </div>

          <div className="pelicula-info">
            <h1>{pelicula.titulo}</h1>

            <div className="datos-pelicula">
              <span>{pelicula.genero}</span>
              <span>{mostrarDuracion(pelicula.duracion)}</span>
              <span>2D</span>
            </div>

            <h2>Sinopsis</h2>
            <p>{pelicula.descripcion || "Sinopsis no disponible."}</p>

            <section className="funciones">
              <h2 className="section-title">
                Funciones disponibles
              </h2>

              {funciones.length === 0 ? (
                <p>
                  Todavía no hay funciones cargadas para esta película.
                </p>
              ) : (
                <div className="funciones-dia">
                  {funciones.map((funcion) => (
                    <div key={funcion.id}>
                      <h3>{mostrarFecha(funcion.fecha)}</h3>

                      <div className="horarios">
                        <button
                          className="horario"
                          onClick={() => seleccionarFuncion(funcion)}
                        >
                          <strong>{funcion.hora}</strong>
                          <span>2D</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <LoginRequiredModal
        visible={loginModal}
        onClose={() => setLoginModal(false)}
      />
    </>
  );
}

export default DetallePelicula;
