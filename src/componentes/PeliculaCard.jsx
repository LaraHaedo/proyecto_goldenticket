// Tarjeta de una película de la cartelera
function PeliculaCard({ pelicula, onComprar }) {
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
        <button className="btn-buy" onClick={() => onComprar(pelicula)}>
          Conseguir Golden Ticket
        </button>
      </div>
    </div>
  );
}

export default PeliculaCard;
