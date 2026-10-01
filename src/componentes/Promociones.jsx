import { promociones } from "../datos/peliculas";

// Sección de promociones del día (tickets dorados)
function Promociones() {
  return (
    <section className="promos-bg" id="promociones">
      <div className="section-container">
        <h2 className="section-title">Promociones Del Día</h2>
        <div className="tickets-grid">
          {promociones.map((promo) => (
            <div key={promo.id} className="ticket-item">
              <div className="ticket-num">{promo.id}.</div>
              <div className="ticket-text">
                <h3>{promo.titulo}</h3>
                <p>{promo.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Promociones;
