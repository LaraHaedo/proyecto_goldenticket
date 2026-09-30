import { formatearPrecio } from "../utilidades";

// Componente reutilizable: recibe el producto y una función por Props (Clase 7)
function ProductoCandy({ producto, onAgregar }) {
  return (
    <article className={`ticket-row ${producto.estilo}`}>
      <div className="ticket-holes left"></div>
      <div className="ticket-holes right"></div>

      <div className="img-container">
        <img src={producto.imagen} alt={producto.nombre} />
        {producto.badge && <span className="badge">{producto.badge}</span>}
      </div>

      <div className="info-container">
        <span className="row-code">{producto.codigo}</span>
        <h3>{producto.nombre}</h3>
        <p className="description">{producto.descripcion}</p>
        <div className="details-tags">
          {producto.detalles.map((detalle) => (
            <span key={detalle}>★ {detalle}</span>
          ))}
        </div>
      </div>

      <div className="action-container">
        <div className="price">
          ${formatearPrecio(producto.precio)}
          <span>,00</span>
        </div>
        <button className="plan-button" onClick={() => onAgregar(producto)}>
          Agregar al pedido
        </button>
      </div>
    </article>
  );
}

export default ProductoCandy;
