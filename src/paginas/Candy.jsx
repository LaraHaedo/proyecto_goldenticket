import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import Encabezado from "../componentes/Encabezado";
import ProductoCandy from "../componentes/ProductoCandy";
import CarritoModal from "../componentes/CarritoModal";
import MensajeCine from "../componentes/MensajeCine";
import { categorias } from "../datos/productos";
import { formatearPrecio } from "../utilidades";
import "../estilos/candy.css";

function Candy() {
  const [categoriaActiva, setCategoriaActiva] = useState("todos");
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [pulso, setPulso] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [comprando, setComprando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function cargarProductos() {
    setCargando(true);
    try {
      const resultado = await getDocs(collection(db, "candy"));
      const lista = resultado.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => item.activo !== false);
      setProductos(lista);
    } catch (error) {
      console.error("Error cargando Candy:", error);
      setMensaje("No se pudieron cargar los productos. Intentá recargar la página.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargarProductos(); }, []);

  const agregarAlCarrito = (producto) => {
    setMensaje("");
    const cantidadActual = carrito.find((item) => item.id === producto.id)?.cantidad || 0;
    if (cantidadActual >= Number(producto.stock || 0)) {
      setMensaje(`No hay más unidades disponibles de ${producto.nombre}.`);
      return;
    }

    setCarrito((actual) => {
      const existe = actual.find((item) => item.id === producto.id);
      if (existe) {
        return actual.map((item) => item.id === producto.id
          ? { ...item, cantidad: item.cantidad + 1, stock: producto.stock }
          : item);
      }
      return [...actual, {
        id: producto.id,
        nombre: producto.nombreCarrito || producto.nombre,
        precio: Number(producto.precio),
        imagen: producto.imagen,
        cantidad: 1,
        stock: Number(producto.stock || 0),
      }];
    });

    setPulso(true);
    setTimeout(() => setPulso(false), 200);
  };

  const cambiarCantidad = (id, cambio) => {
    setCarrito((actual) => actual
      .map((item) => item.id === id
        ? { ...item, cantidad: Math.min(item.stock, item.cantidad + cambio) }
        : item)
      .filter((item) => item.cantidad > 0));
  };

  const finalizarCompra = async () => {
    if (!carrito.length || comprando) return;
    const usuario = auth.currentUser;
    if (!usuario) {
      alert("Para confirmar la compra, primero iniciá sesión.");
      return;
    }

    setComprando(true);
    try {
      const token = await usuario.getIdToken();
      const respuesta = await fetch("http://localhost:3000/api/candy/compra", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: carrito.map(({ id, cantidad }) => ({ id, cantidad })),
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo confirmar la compra.");

      alert("¡Compra confirmada! El stock se actualizó correctamente. Acercate a la barra VIP para retirar tu pedido.");
      setCarrito([]);
      setCarritoAbierto(false);
      setMensaje("");
      await cargarProductos();
    } catch (error) {
      console.error("Error confirmando compra:", error);
      alert(error.message || "No se pudo confirmar la compra.");
      await cargarProductos();
    } finally {
      setComprando(false);
    }
  };

  const cantidadTotal = carrito.reduce((suma, item) => suma + item.cantidad, 0);
  const precioTotal = carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
  const categoriasVisibles = categorias.filter((cat) =>
    cat.id !== "todos" && (categoriaActiva === "todos" || categoriaActiva === cat.id)
  );

  const productosPorCategoria = useMemo(() => productos, [productos]);

  return (
    <div className="pagina-candy">
      <main className="plans-section">
        <div className="film-strip film-left"></div>
        <div className="film-strip film-right"></div>

        <Encabezado titulo="CANDY BAR & SNACKS">
          Acompañá tu función con la mejor experiencia gastronómica. Elegí tus
          combos y snacks favoritos y retirálos sin demoras en la barra VIP.
        </Encabezado>

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

        {mensaje && <p className="candy-feedback" role="status">{mensaje}</p>}
        {cargando ? (
          <p className="candy-feedback">Cargando productos del Candy...</p>
        ) : productos.length === 0 ? (
          <p className="candy-feedback">Todavía no hay productos cargados. El administrador puede cargar el catálogo desde el panel.</p>
        ) : (
          categoriasVisibles.map((cat) => {
            const lista = productosPorCategoria.filter((producto) => producto.categoria === cat.id);
            if (!lista.length) return null;
            return (
              <section className="candy-category-group" id={cat.id} key={cat.id}>
                <h2 className="category-title">{cat.titulo}</h2>
                <div className="candy-list">
                  {lista.map((producto) => (
                    <ProductoCandy
                      key={producto.id}
                      producto={producto}
                      onAgregar={agregarAlCarrito}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}

        <MensajeCine titulo="COMIENZA CON EL MEJOR SABOR EN TU BUTACA" />
      </main>

      <button
        type="button"
        className={`cart-floating-btn ${pulso ? "pulso" : ""}`}
        onClick={() => setCarritoAbierto(true)}
      >
        🛒 MI PEDIDO ({cantidadTotal}) | ${formatearPrecio(precioTotal)}
      </button>

      <CarritoModal
        abierto={carritoAbierto}
        carrito={carrito}
        total={precioTotal}
        comprando={comprando}
        onCerrar={() => setCarritoAbierto(false)}
        onCambiarCantidad={cambiarCantidad}
        onFinalizar={finalizarCompra}
      />
    </div>
  );
}

export default Candy;
