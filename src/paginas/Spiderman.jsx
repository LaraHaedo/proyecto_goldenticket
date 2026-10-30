import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../estilos/pelicula.css";
import LoginRequiredModal from "../componentes/LoginRequiredModal";
import { DIAS, FUNCIONES, PELICULA } from "../datos/funcionesSpiderman";
import { estaLogueado, guardarPaginaRetorno } from "../utils/auth";

const poster = "/peliculas/Spiderman.jpg";

function Spiderman() {
  const [diaActivo, setDiaActivo] = useState("lunes");
  const [loginModal, setLoginModal] = useState(false);
  const navigate = useNavigate();

  function seleccionarFuncion(dia, fecha, hora, formato) {
    const funcion = { pelicula: PELICULA, dia, fecha, hora, formato, poster };
    localStorage.setItem("funcionSeleccionada", JSON.stringify(funcion));
    localStorage.removeItem("compraEnCurso");
    localStorage.removeItem("reservaVence");
    if (estaLogueado()) navigate("/compra");
    else {
      guardarPaginaRetorno("/compra");
      setLoginModal(true);
    }
  }

  return (
    <>
      <main className="pelicula-container">
        <div className="pelicula">
          <div className="poster-container">
            <img src={poster} alt={PELICULA} className="pelicula-poster" />
          </div>
          <div className="pelicula-info">
            <h1>SPIDER-MAN: BRAND NEW DAY</h1>
            <div className="datos-pelicula">
              <span>Acción</span>
              <span>2h 30m</span>
              <span>2D</span>
            </div>
            <h2>Sinopsis</h2>
            <p>
                Peter Parker regresa como Spider-Man en una nueva aventura
                llena de acción, desafíos y nuevos enemigos.
            </p>
            <div className="informacion-extra">
              <div>
                <strong>Actores:</strong>
                <p>Tom Holland, Zendaya</p>
              </div>
              <div>
                <strong>Duración:</strong>
                <p>2 horas 30 minutos</p>
              </div>
              <div>
                <strong>Fecha de estreno:</strong>
                <p>31 de julio de 2026</p>
              </div>
            </div>
          </div>
        </div>
        <section className="funciones">
          <h2 className="section-title">Funciones disponibles</h2>
          <div className="dias">
            {DIAS.map((d) => (
              <button
                key={d.id}
                className={`dia ${diaActivo === d.id ? "active" : ""}`}
                onClick={() => setDiaActivo(d.id)}
              >
                <span>{d.nombre}</span>
                <strong>{d.numero}</strong>
                <small>{d.mes}</small>
              </button>
            ))}
          </div>
          <div className="funciones-dia">
            {["2D"].map((formato) => (
              <div key={formato}>
                <h3>Funciones en {formato}</h3>
                <div className="horarios">
                  {FUNCIONES[diaActivo]["2D"].map((hora) => {
                    const d = DIAS.find((x) => x.id === diaActivo);
                    return (
                      <button
                        className="horario"
                        key={`${formato}-${hora}`}
                        onClick={() =>
                          seleccionarFuncion(d.dia, d.fecha, hora, formato)
                        }
                      >
                        <strong>{hora}</strong>
                        <span>{formato}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <LoginRequiredModal
        visible={loginModal}
        onClose={() => setLoginModal(false)}
      />
    </>
  );
}
export default Spiderman;
