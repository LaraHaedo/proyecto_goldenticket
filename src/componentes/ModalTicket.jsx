import { useState } from "react";

// Ventana para sacar entradas de la película elegida
function ModalTicket({ pelicula, onCerrar }) {
  const [horario, setHorario] = useState(pelicula.horarios[0]);
  const [cantidad, setCantidad] = useState(2);

  const manejarSubmit = (e) => {
    e.preventDefault();

    if (Number(cantidad) < 1 || Number(cantidad) > 10) {
      alert("La cantidad debe estar entre 1 y 10");
      return;
    }

    alert(
      `¡Enhorabuena! ${cantidad} Golden Ticket(s) para ${pelicula.titulo} a las ${horario} hs.`
    );
    onCerrar();
  };

  return (
    <div
      className="ticket-modal"
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div className="ticket-modal-content">
        <span className="close-modal" onClick={onCerrar}>
          &times;
        </span>
        <h2>🎟️ Tu Golden Ticket</h2>

        <form onSubmit={manejarSubmit}>
          <label>Película seleccionada:</label>
          <input type="text" value={pelicula.titulo} readOnly />

          <label>Selecciona Horario:</label>
          <select value={horario} onChange={(e) => setHorario(e.target.value)}>
            {pelicula.horarios.map((hora) => (
              <option key={hora} value={hora}>
                {hora} hs
              </option>
            ))}
          </select>

          <label>Cantidad de Entradas:</label>
          <input
            type="number"
            min="1"
            max="10"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            required
          />

          <button type="submit" className="modal-btn">
            Confirmar Golden Ticket
          </button>
        </form>
      </div>
    </div>
  );
}

export default ModalTicket;
