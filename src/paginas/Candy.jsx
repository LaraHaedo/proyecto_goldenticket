import { useState } from "react";
import Encabezado from "../componentes/Encabezado";
import ProductoCandy from "../componentes/ProductoCandy";
import CarritoModal from "../componentes/CarritoModal";
import MensajeCine from "../componentes/MensajeCine";
import { categorias, productos } from "../datos/productos";
import { formatearPrecio } from "../utilidades";
import "../estilos/candy.css";

function Candy() {
  const [categoriaActiva, setCategoriaActiva] = useState("todos");
  const [carrito, setCarrito] = useState([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [pulso, setPulso] = useState(false);

  //carrito
  const agregarAlCarrito = (producto) => {
    const existe = carrito.find((item) => item.id === producto.id);

    if (existe) {
      
      setCarrito(
        carrito.map((item) =>
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      );
    } else {
      setCarrito([
        ...carrito,
        {
          id: producto.id,
          nombre: producto.nombreCarrito,
          precio: producto.precio,
          imagen: producto.imagen,
          cantidad: 1,
        },
      ]);
    }

    // el botón flotante
    setPulso(true);
    setTimeout(() => setPulso(false), 200);
  };

  const cambiarCantidad = (id, cambio) => {
    const actualizado = carrito
      .map((item) =>
        item.id === id ? { ...item, cantidad: item.cantidad + cambio } : item
      )
      
      .filter((item) => item.cantidad > 0);

    setCarrito(actualizado);
  };

  const finalizarCompra = () => {
    if (carrito.length === 0) {
      alert("Agregá al menos un producto a tu pedido.");
      return;
    }

    alert(
      "¡Pedido confirmado! Acércate a la barra VIP de Candy Bar para retirar con tu Golden Ticket."
    );
    setCarrito([]);
    setCarritoAbierto(false);
  };

  const cantidadTotal = carrito.reduce((suma, item) => suma + item.cantidad, 0);
  const precioTotal = carrito.reduce(
    (suma, item) => suma + item.precio * item.cantidad,
    0
  );

  
  const categoriasVisibles = categorias.filter(
    (cat) =>
      cat.id !== "todos" &&
      (categoriaActiva === "todos" || categoriaActiva === cat.id)
  );

  return (
    <div className="pagina-candy">
      <main className="plans-section">
        <div className="film-strip film-left"></div>
        <div className="film-strip film-right"></div>

        <Encabezado titulo="CANDY BAR & SNACKS">
          Acompañá tu función con la mejor experiencia gastronómica. Elegí tus
          combos y snacks favoritos y retirálos sin demoras en la barra VIP.
        </Encabezado>

        {}
        <div className="category-nav">
          {categorias.map((cat) => (
            <button
              key={cat.id}
              className={`cat-btn ${categoriaActiva === cat.id ? "active" : ""}`}
              onClick={() => setCategoriaActiva(cat.id)}
            >
              {cat.etiqueta}
            </button>
          ))}
        </div>

        {}
        {categoriasVisibles.map((cat) => (
          <section className="candy-category-group" id={cat.id} key={cat.id}>
            <h2 className="category-title">{cat.titulo}</h2>
            <div className="candy-list">
              {productos
                .filter((producto) => producto.categoria === cat.id)
                .map((producto) => (
                  <ProductoCandy
                    key={producto.id}
                    producto={producto}
                    onAgregar={agregarAlCarrito}
                  />
                ))}
            </div>
          </section>
        ))}

        <MensajeCine titulo="COMIENZA CON EL MEJOR SABOR EN TU BUTACA" />
      </main>

      {/* botón del carrito*/}
      <div
        className={`cart-floating-btn ${pulso ? "pulso" : ""}`}
        onClick={() => setCarritoAbierto(true)}
      >
        🛒 MI PEDIDO ({cantidadTotal}) | ${formatearPrecio(precioTotal)}
      </div>

      <CarritoModal
        abierto={carritoAbierto}
        carrito={carrito}
        total={precioTotal}
        onCerrar={() => setCarritoAbierto(false)}
        onCambiarCantidad={cambiarCantidad}
        onFinalizar={finalizarCompra}
      />
    </div>
  );
}

export default Candy;
