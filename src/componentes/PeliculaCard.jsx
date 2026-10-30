import { useNavigate } from "react-router-dom";

// Tarjeta de una película de la cartelera
function PeliculaCard({ pelicula }) {
  const navigate = useNavigate();
  const abrirDetalle = () => {
    const rutas = {
      1: "/pelicula/avatar",
      2: "/pelicula/terrifier",
      3: "/pelicula/odisea",
      4: "/pelicula/spiderman",
    };

    navigate(rutas[pelicula.id]);
  };
    return (
    <div className="movie-card">
      <img src={pelicula.imagen} alt={pelicula.titulo} className="movie-poster" />
      <div className="movie-details">
        <div>
          <div className="movie-title">{pelicula.titulo}</div>
          <div className="movie-tag">
            {pelicula.genero} • {pelicula.duracion}
          </div>
          <div className="schedules">
            {pelicula.horarios.map((hora) => (
              <span key={hora} className="time-badge">
                {hora}
              </span>
            ))}
          </div>
        </div>
        <button className="btn-buy" onClick={abrirDetalle}>
          Conseguir Golden Ticket
        </button>
      </div>
    </div>
  );
}

export default PeliculaCard;
