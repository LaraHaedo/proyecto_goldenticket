import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginRequiredModal from "../componentes/LoginRequiredModal";
import { DIAS, FUNCIONES, PELICULA } from "../datos/funcionesAvatar";
import { estaLogueado, guardarPaginaRetorno } from "../utils/auth";

const poster = "/peliculas/Avatar.jpg";

function Pelicula() {
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
            <h1>AVATAR: FUEGO Y CENIZAS</h1>
            <div className="datos-pelicula">
              <span>Ciencia Ficción</span>
              <span>3h 15m</span>
              <span>2D</span>
            </div>
            <h2>Sinopsis</h2>
            <p>
              Una nueva aventura nos lleva nuevamente al mundo de Pandora, donde
              sus habitantes deberán enfrentarse a nuevos desafíos mientras
              protegen su hogar y a su familia.
            </p>
            <div className="informacion-extra">
              <div>
                <strong>Actores:</strong>
                <p>Sam Worthington, Zoe Saldaña</p>
              </div>
              <div>
                <strong>Duración:</strong>
                <p>3 horas 15 minutos</p>
              </div>
              <div>
                <strong>Fecha de estreno:</strong>
                <p>18 de diciembre de 2026</p>
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
                  {FUNCIONES[diaActivo][formato].map((hora) => {
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
export default Pelicula;
