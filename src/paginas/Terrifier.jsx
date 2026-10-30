import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginRequiredModal from "../componentes/LoginRequiredModal";
import { DIAS, FUNCIONES, PELICULA } from "../datos/funcionesTerrifier";
import { estaLogueado, guardarPaginaRetorno } from "../utils/auth";

const poster = "/peliculas/Terrifier.jpg";

function Terrifier() {
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
            <h1>TERRIFIER 3</h1>
            <div className="datos-pelicula">
              <span>Terror</span>
              <span>2h 5m</span>
              <span>2D</span>
            </div>
            <h2>Sinopsis</h2>
            <p>
                Art, el payaso, regresa en una nueva historia de terror
                que llevará a los protagonistas a enfrentarse a nuevos peligros.
            </p>
            <div className="informacion-extra">
              <div>
                <strong>Actores:</strong>
                <p>David Howard Thornton</p>
              </div>
              <div>
                <strong>Duración:</strong>
                <p>2 horas 5 minutos</p>
              </div>
              <div>
                <strong>Fecha de estreno:</strong>
                <p>11 de octubre de 2024</p>
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
            <div>
                <h3>Funciones en 2D</h3>
                <div className="horarios">
                {FUNCIONES[diaActivo]["2D"].map((hora) => {
                    const d = DIAS.find((x) => x.id === diaActivo);
                    return (
                    <button
                        className="horario"
                        key={`2D-${hora}`}
                        onClick={() =>
                        seleccionarFuncion(d.dia, d.fecha, hora, "2D")
                        }
                    >
                        <strong>{hora}</strong>
                        <span>2D</span>
                    </button>
                    );
                })}
                </div>
            </div>
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
export default Terrifier;
