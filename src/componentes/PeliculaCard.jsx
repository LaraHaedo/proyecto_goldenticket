
import { useNavigate } from "react-router-dom";

function PeliculaCard({ pelicula }) {
  const navigate = useNavigate();

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

  const horarios = Array.isArray(pelicula.horarios)
    ? pelicula.horarios
    : [];

  return (
    <div className="movie-card">
      <img
        src={pelicula.imagen}
        alt={pelicula.titulo}
        className="movie-poster"
      />

      <div className="movie-details">
        <div>
          <div className="movie-title">{pelicula.titulo}</div>

          <div className="movie-tag">
            {pelicula.genero} • {mostrarDuracion(pelicula.duracion)}
          </div>

          <div className="schedules">
            {horarios.map((hora) => (
              <span key={hora} className="time-badge">
                {hora}
              </span>
            ))}
          </div>
        </div>

        <button
          className="btn-buy"
          onClick={() => navigate(`/pelicula/${pelicula.id}`)}
        >
          Conseguir Golden Ticket
        </button>
      </div>
    </div>
  );
}

export default PeliculaCard;
