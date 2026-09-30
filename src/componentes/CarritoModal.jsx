import { formatearPrecio } from "../utilidades";

function CarritoModal({ abierto, carrito, total, onCerrar, onCambiarCantidad, onFinalizar }) {
  return (
    <div className={`cart-modal-overlay ${abierto ? "open" : ""}`}>
      <div className="cart-modal">
        <div className="cart-header">
          <h2>🎟️ Resumen de tu Candy</h2>
          <button className="close-modal" onClick={onCerrar}>&times;</button>
        </div>

        <div className="cart-items">
          {carrito.length === 0 ? (
            <p style={{ textAlign: "center", color: "#888", margin: "30px 0" }}>
              Tu carrito está vacío 🍿
            </p>
          ) : (
            carrito.map((item) => (
              <div className="cart-item-row" key={item.id}>
                <div className="cart-item-info">
                  <img src={item.imagen} alt={item.nombre} />
                  <div>
                    <div className="cart-item-title">{item.nombre}</div>
                    <div className="cart-item-price">
                      ${formatearPrecio(item.precio * item.cantidad)}
                    </div>
                  </div>
                </div>

                <div className="qty-controls">
                  <button className="qty-btn" onClick={() => onCambiarCantidad(item.id, -1)}>-</button>
                  <span>{item.cantidad}</span>
                  <button className="qty-btn" onClick={() => onCambiarCantidad(item.id, 1)}>+</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-total-row">
            <span>Total a pagar:</span>
            <span>${formatearPrecio(total)}</span>
          </div>
          <button className="checkout-btn" onClick={onFinalizar}>Confirmar y Pagar</button>
        </div>
      </div>
    </div>
  );
}

export default CarritoModal;
