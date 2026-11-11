import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import QRCode from "qrcode";
import {
  estaLogueado,
  guardarPaginaRetorno,
  obtenerUsuario,
  
} from "../utils/auth";
import {
  calcularPrecio,
  entradasGratisDisponibles,
  MAX_ENTRADAS,
  NIVELES,
  obtenerNivel,
  PRECIOS,
  claveMes,
} from "../utils/descuentos";
import "../estilos/compra.css";
import { auth, db } from "../firebase/config";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
const FILAS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const BLOQUES = [4, 7, 4];
const TIEMPO_RESERVA = 5 * 60;


function formatearPrecio(valor) {
  return "$" + Math.round(valor).toLocaleString("es-AR");
}
function claveFuncion(funcion) {
  return [funcion.dia, funcion.fecha, funcion.hora, funcion.formato].join("|");
}
function generarCodigo() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let codigo = "GT-";
  for (let i = 0; i < 6; i++)
    codigo += letras[Math.floor(Math.random() * letras.length)];
  return codigo;
}

function Compra() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qrRef = useRef(null);
  const verificando = useRef(false);
  const [funcion, setFuncion] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [nivel, setNivel] = useState("bronce");
  const [cantidad, setCantidad] = useState(1);
  const [butacas, setButacas] = useState([]);
  const [paso, setPaso] = useState(1);
  const [metodo, setMetodo] = useState("");
  const [tiempo, setTiempo] = useState("");
  const [modalTiempo, setModalTiempo] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [errorButacas, setErrorButacas] = useState("");
  const [errorPago, setErrorPago] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [tarjetaNumero, setTarjetaNumero] = useState("");
  const [tarjetaTitular, setTarjetaTitular] = useState("");
  const [tarjetaVence, setTarjetaVence] = useState("");
  const [tarjetaCvv, setTarjetaCvv] = useState("");
  const [compraFinal, setCompraFinal] = useState(null);
  const [nivelNuevo, setNivelNuevo] = useState(null);
  const [ocupadas, setOcupadas] = useState(new Set());

  useEffect(() => {
    if (!funcion?.funcionId) return;

    const referencia = doc(db, "horarios", funcion.funcionId);

    const cancelar = onSnapshot(referencia, (snapshot) => {
      if (snapshot.exists()) {
        setOcupadas(new Set(snapshot.data().butacasOcupadas || []));
      }
    });

    return () => cancelar();
  }, [funcion]);

  useEffect(() => {
    if (!estaLogueado()) {
      guardarPaginaRetorno("/compra");
      navigate("/login");
      return;
    }
    const u = obtenerUsuario();
    setUsuario(u);
    setNivel(obtenerNivel(u?.compras || 0));
    const f = JSON.parse(localStorage.getItem("funcionSeleccionada") || "null");
    if (!f || !PRECIOS[f.formato]) {
      navigate("/");
      return;
    }
    setFuncion(f);
    const guardada = JSON.parse(
      localStorage.getItem("compraEnCurso") || "null",
    );
    if (guardada && guardada.clave === claveFuncion(f)) {
      setCantidad(guardada.cantidad || 1);
      setButacas(guardada.butacas || []);
      setPaso(Math.min(guardada.paso || 1, 3));
    }
    setNombre(u?.nombre || localStorage.getItem("usuarioActual") || "");
    setEmail(u?.email || "");
  }, [navigate]);

  useEffect(() => {
    if (!funcion || compraFinal) return;
    const almacenado = parseInt(localStorage.getItem("reservaVence"), 10);
    const vence = almacenado || Date.now() + TIEMPO_RESERVA * 1000;
    if (!almacenado) localStorage.setItem("reservaVence", vence);
    const tic = () => {
      const restante = Math.round((vence - Date.now()) / 1000);
      if (restante <= 0) {
        setTiempo("");
        setModalTiempo(true);
        return;
      }
      setTiempo(
        `${String(Math.floor(restante / 60)).padStart(2, "0")}:${String(restante % 60).padStart(2, "0")}`,
      );
    };
    tic();
    const id = setInterval(tic, 1000);
    return () => clearInterval(id);
  }, [funcion, compraFinal]);

  useEffect(() => {
    if (funcion && paso <= 3)
      localStorage.setItem(
        "compraEnCurso",
        JSON.stringify({
          clave: claveFuncion(funcion),
          cantidad,
          butacas,
          paso,
        }),
      );
  }, [funcion, cantidad, butacas, paso]);
  useEffect(() => {
  let cancelarPerfil = () => {};

  const cancelarAuth = onAuthStateChanged(auth, (user) => {
    cancelarPerfil();
    if (!user) return;

    cancelarPerfil = onSnapshot(doc(db, "usuarios", user.uid), (snap) => {
      if (!snap.exists()) return;
      const datos = snap.data();
      setUsuario((prev) => ({ ...prev, ...datos }));
      setNivel(obtenerNivel(datos.compras || 0));
      setNombre((n) => n || datos.nombre || "");
      setEmail((e) => e || datos.email || "");
    });
  });

  return () => {
    cancelarAuth();
    cancelarPerfil();
  };
}, []);
  useEffect(() => {
    const verificarPago = async () => {
      const estadoMP = searchParams.get("status") ||
        searchParams.get("collection_status");

      if (!estadoMP) return;
      if (verificando.current) return;
      verificando.current = true;

      const pendiente = JSON.parse(
        localStorage.getItem("pagoPendienteMP") || "null",
      );

      if (!pendiente?.compraId) {
        setErrorPago("No se encontró la información de la compra.");
        setPaso(3);
        return;
      }

      if (estadoMP !== "approved") {
        setErrorPago("El pago no fue aprobado. No se ocuparon las butacas.");
        setPaso(3);
        return;
      }

      try {
        setProcesando(true);
        await auth.authStateReady();
        const token = await auth.currentUser.getIdToken();

        // Esperamos hasta 30 segundos a que llegue la confirmación del webhook.
        for (let intento = 0; intento < 15; intento++) {
          const respuesta = await fetch(
            `/api/entradas/estado/${pendiente.compraId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          const data = await respuesta.json();

          if (data.estado === "pagada") {
            await finalizarCompra("Mercado Pago", pendiente, data);
            return;
          }

          if (data.estado === "conflicto_butacas") {
            throw new Error(
              "El pago fue aprobado, pero las butacas ya no estaban disponibles. Contactá al administrador.",
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        setErrorPago(
          "El pago todavía está pendiente de confirmación. No vuelvas a pagar; esperá unos instantes y consultá el estado.",
        );
        setPaso(3);
      } catch (error) {
        console.error("Error verificando el pago:", error);
        setErrorPago(error.message || "No se pudo verificar el pago.");
        setPaso(3);
      } finally {
        setProcesando(false);
      }
    };

    verificarPago();
  }, [searchParams]);

  const calculo = useMemo(
    () =>
      funcion
        ? calcularPrecio(
            PRECIOS[funcion.formato],
            cantidad,
            funcion.dia,
            nivel,
            entradasGratisDisponibles(nivel, usuario?.gratis),
          )
        : null,
    [funcion, cantidad, nivel, usuario],
  );

  function guardarEstadoCompra(
    nuevaCantidad = cantidad,
    nuevasButacas = butacas,
    nuevoPaso = paso,
  ) {
    if (funcion)
      localStorage.setItem(
        "compraEnCurso",
        JSON.stringify({
          clave: claveFuncion(funcion),
          cantidad: nuevaCantidad,
          butacas: nuevasButacas,
          paso: nuevoPaso,
        }),
      );
  }
  function irAPaso(n) {
    setPaso(n);
    setErrorButacas("");
    setErrorPago("");
    guardarEstadoCompra(cantidad, butacas, n);
    window.scrollTo(0, 0);
  }
  function cambiarCantidad(cambio) {
    const nueva = cantidad + cambio;
    if (nueva < 1 || nueva > MAX_ENTRADAS) return;
    const nuevas = butacas.slice(0, nueva);
    setCantidad(nueva);
    setButacas(nuevas);
    guardarEstadoCompra(nueva, nuevas, paso);
  }
  function alternarButaca(id) {
    if (ocupadas.has(id)) return;

    setErrorButacas("");

    let nuevas = [...butacas];

    if (nuevas.includes(id)) {
      nuevas = nuevas.filter((b) => b !== id);
    } else if (nuevas.length >= cantidad) {
      nuevas.shift();
      nuevas.push(id);
    } else {
      nuevas.push(id);
    }

    nuevas.sort((a, b) =>
      a[0] === b[0]
        ? Number(a.slice(1)) - Number(b.slice(1))
        : a.localeCompare(b),
    );

    setButacas(nuevas);
    guardarEstadoCompra(cantidad, nuevas, paso);
  }
  function validarPago() {
    if (nombre.trim().length < 3) {
      setErrorPago("Ingresá tu nombre y apellido.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorPago("Ingresá un email válido.");
      return false;
    }
    if (!metodo) {
      setErrorPago("Elegí un método de pago para continuar.");
      return false;
    }
    if (metodo !== "mp") {
      const numeroLimpio = tarjetaNumero.replace(/\s/g, "");
      if (!/^\d{13,19}$/.test(numeroLimpio)) {
        setErrorPago("Ingresá un número de tarjeta de prueba de entre 13 y 19 dígitos.");
        return false;
      }
      if (tarjetaTitular.trim().length < 3) {
        setErrorPago("Ingresá el nombre del titular.");
        return false;
      }
      if (!/^\d{2}\/\d{2}$/.test(tarjetaVence) || Number(tarjetaVence.slice(0, 2)) < 1 || Number(tarjetaVence.slice(0, 2)) > 12) {
        setErrorPago("Ingresá un vencimiento válido con formato MM/AA.");
        return false;
      }
      if (tarjetaCvv.length < 3) {
        setErrorPago("El código de seguridad debe tener 3 o 4 números.");
        return false;
      }
    }
    setErrorPago("");
    return true;
  }
  async function pagar() {
    if (!validarPago()) return;
    if (metodo === "mp") {
      await pagarConMercadoPago();
      return;
    }
    await pagarConTarjetaDemo();
  }
  async function pagarConTarjetaDemo() {
    try {
      setProcesando(true);
      setErrorPago("");

      const token = await auth.currentUser.getIdToken();

      const respuesta = await fetch("/api/entradas/demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          funcionId: funcion.funcionId,
          butacas,
        }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.error || "No se pudo completar la compra.");
      }

      await finalizarCompra(metodo, null, data);
    } catch (error) {
      console.error("Error al comprar:", error);
      setErrorPago(error.message || "Ocurrió un error al procesar el pago.");
    } finally {
      setProcesando(false);
    }
  }
  async function pagarConMercadoPago() {
    try {
      setProcesando(true);
      setErrorPago("");

      const token = await auth.currentUser.getIdToken();

      const respuesta = await fetch(
        "/api/entradas/mercadopago",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            funcionId: funcion.funcionId,
            butacas,
          }),
        },
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.error || "No se pudo iniciar el pago.");
      }

      localStorage.setItem(
        "pagoPendienteMP",
        JSON.stringify({
          compraId: data.compraId,
          funcion,
          cantidad,
          butacas,
          nombre,
          email,
        }),
      );

      window.location.assign(data.url);
    } catch (error) {
      console.error("Error iniciando Mercado Pago:", error);
      setErrorPago(error.message || "No se pudo conectar con Mercado Pago.");
      setProcesando(false);
    }
  }
  async function finalizarCompra(metodoTexto, pendiente = null, resultadoServidor = null) {
      const f = pendiente?.funcion || funcion;
  if (!f) return;
    const c = pendiente?.funcion
      ? calcularPrecio(
          PRECIOS[pendiente.funcion.formato],
          pendiente.cantidad,
          pendiente.funcion.dia,
          nivel,
          entradasGratisDisponibles(nivel, usuario?.gratis),
        )
      : calculo;

    const compra = {
      codigo: generarCodigo(),
      compraId: resultadoServidor?.compraId || "",
      pelicula: f.pelicula,
      dia: f.dia,
      fecha: f.fecha,
      hora: f.hora,
      formato: f.formato,
      cantidad: pendiente?.cantidad || cantidad,
      butacas: (pendiente?.butacas || butacas).slice(),
      subtotal: resultadoServidor?.subtotal ?? c.subtotal,
      descuento: c.promo?.nombre || "",
      entradasGratis: c.gratis?.cantidad || 0,
      total: resultadoServidor?.total ?? c.total,
      metodoPago: metodoTexto,
      nombre: (pendiente?.nombre || nombre).trim(),
      email: (pendiente?.email || email).trim(),
      nivel: resultadoServidor?.nivel || nivel,
      fechaCompra: new Date().toISOString(),
    };

    // Actualizamos el nivel y las compras en pantalla.
    // El backend ya se encargó de guardar los datos en Firebase.
    if (usuario && resultadoServidor?.compras !== undefined) {
      const actualizado = {
        ...usuario,
        compras: resultadoServidor.compras,
      };

      setUsuario(actualizado);

      const nuevo = obtenerNivel(resultadoServidor.compras);
      setNivelNuevo(nuevo !== nivel ? nuevo : null);
      setNivel(nuevo);
    }

    // Guardamos el comprobante para mostrarlo en esta sesión.
    const historial = JSON.parse(
      localStorage.getItem("comprasRealizadas") || "[]",
    );

    historial.push(compra);

    localStorage.setItem("comprasRealizadas", JSON.stringify(historial));
    localStorage.setItem("ultimaCompra", JSON.stringify(compra));

    localStorage.removeItem("compraEnCurso");
    localStorage.removeItem("reservaVence");
    localStorage.removeItem("funcionSeleccionada");
    localStorage.removeItem("pagoPendienteMP");

    setCompraFinal(compra);
    setPaso(4);
    window.scrollTo(0, 0);
  }
  useEffect(() => {
    if (compraFinal && qrRef.current) {
      const texto = [
        "GOLDENTICKET",
        compraFinal.codigo,
        compraFinal.pelicula,
        `${compraFinal.dia} ${compraFinal.fecha} ${compraFinal.hora}hs`,
        compraFinal.formato,
        compraFinal.butacas.join(","),
        `${compraFinal.cantidad} entradas`,
      ].join("|");
      QRCode.toCanvas(qrRef.current, texto, { margin: 4, scale: 6 }, () => {});
    }
  }, [compraFinal]);
  function descargarQR() {
    if (!qrRef.current) return;
    const a = document.createElement("a");
    a.href = qrRef.current.toDataURL("image/png");
    a.download = `entrada-${compraFinal?.codigo || "goldenticket"}.png`;
    a.click();
  }
  function cancelar() {
    if (window.confirm("¿Querés cancelar la compra?")) {
      localStorage.removeItem("compraEnCurso");
      localStorage.removeItem("reservaVence");
      localStorage.removeItem("funcionSeleccionada");
      navigate("/");
    }
  }
  if (!funcion && !compraFinal) return null;

  const titulo = { 1: "Entradas", 2: "Butacas", 3: "Pago", 4: "Confirmación" }[
    paso
  ];
  const aviso = [];
  if (calculo?.promo)
    aviso.push(
      `Descuento aplicado: ${calculo.promo.nombre} (−${formatearPrecio(calculo.promo.ahorro)}).`,
    );
  if (calculo?.gratis)
    aviso.push(
      `Usás ${calculo.gratis.cantidad} entrada(s) gratis de tu nivel Dorado (−${formatearPrecio(calculo.gratis.ahorro)}).`,
    );
  const continuar = () => {
    if (paso === 1) irAPaso(2);
    else if (paso === 2) {
      if (butacas.length !== cantidad) {
        setErrorButacas(`Elegí ${cantidad} butaca(s) para continuar.`);
        return;
      }
      irAPaso(3);
    } else if (paso === 3) pagar();
  };

  return (
    <div className="checkout-body">
      <div className="checkout-header">
        <button
          className={`icono-btn ${paso === 4 ? "invisible" : ""}`}
          onClick={() => (paso > 1 ? irAPaso(paso - 1) : navigate("/"))}
        >
          &larr;
        </button>
        <div className="checkout-titulo">
          <span>{titulo}</span>
          {paso < 4 && (
            <span
              className={`temporizador ${parseInt(tiempo?.split(":")[0] || 0) * 60 + parseInt(tiempo?.split(":")[1] || 0) <= 60 ? "urgente" : ""}`}
            >
              {" "}
              · {tiempo}
            </span>
          )}
        </div>
        <button
          className="icono-btn"
          onClick={paso === 4 ? () => navigate("/") : cancelar}
        >
          &times;
        </button>
      </div>
      {paso < 4 && (
        <div className="pasos">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`paso-ind ${paso === n ? "activo" : ""} ${n < paso ? "hecho" : ""}`}
            >
              <span>{n}</span>
              {["Entradas", "Butacas", "Pago"][n - 1]}
            </div>
          ))}
        </div>
      )}
      <div className={`checkout ${paso === 4 ? "sin-resumen" : ""}`}>
        <section className="checkout-main">
          {paso === 1 && (
            <div className="paso">
              <h1 className="paso-titulo">ELEGÍ LA CANTIDAD DE ENTRADAS</h1>
              <div className="nivel-box">
                <span className={`nivel-badge ${nivel}`}>
                  {NIVELES[nivel].nombre}
                </span>
                <p>
                  Tu nivel de asociado: {NIVELES[nivel].nombre}. Beneficio:{" "}
                  {NIVELES[nivel].beneficio}.
                </p>
              </div>
              <h2 className="subtitulo">GENERAL</h2>
              <div className="entrada-card">
                <div className="entrada-icono">🎟️</div>
                <div className="entrada-info">
                  <span>Entrada {funcion.formato}</span>
                  <strong>{formatearPrecio(PRECIOS[funcion.formato])}</strong>
                </div>
                <div className="selector-cantidad">
                  <button
                    disabled={cantidad <= 1}
                    onClick={() => cambiarCantidad(-1)}
                  >
                    −
                  </button>
                  <span>{cantidad}</span>
                  <button
                    disabled={cantidad >= MAX_ENTRADAS}
                    onClick={() => cambiarCantidad(1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <p className="promo-aviso">{aviso.join(" ")}</p>
            </div>
          )}
          {paso === 2 && (
            <div className="paso">
              <h1 className="paso-titulo">ELEGÍ TUS BUTACAS</h1>
              <p className="ayuda">
                Elegí {cantidad} butaca{cantidad > 1 ? "s" : ""} (
                {butacas.length} de {cantidad} elegidas).
              </p>
              <div className="pantalla-cine">PANTALLA</div>
              <div className="mapa-scroll">
                <div className="mapa">
                  {FILAS.map((fila) => (
                    <div className="fila" key={fila}>
                      <span className="fila-letra">{fila}</span>
                      {BLOQUES.map((tamano, bidx) => (
                        <div className="bloque" key={bidx}>
                          {Array.from({ length: tamano }, (_, i) => {
                            const id =
                              fila +
                              (bidx === 0
                                ? i + 1
                                : bidx === 1
                                  ? 5 + i
                                  : 12 + i);
                            const ocupada = ocupadas.has(id);
                            const seleccionada = butacas.includes(id);
                            return (
                              <button
                                key={id}
                                disabled={ocupada}
                                className={`butaca ${ocupada ? "ocupada" : ""} ${seleccionada ? "seleccionada" : ""}`}
                                onClick={() => alternarButaca(id)}
                              >
                                {id.slice(1)}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="leyenda">
                <span>
                  <i className="butaca-demo disponible"></i> Disponible
                </span>
                <span>
                  <i className="butaca-demo ocupada"></i> Ocupada
                </span>
                <span>
                  <i className="butaca-demo seleccionada"></i> Seleccionada
                </span>
              </div>
              <p className="error-compra">{errorButacas}</p>
            </div>
          )}
          {paso === 3 && (
            <div className="paso">
              <h1 className="paso-titulo">ELEGÍ CÓMO PAGAR</h1>
              <h2 className="subtitulo">DATOS PERSONALES</h2>
              <div className="form-fila">
                <div className="campo">
                  <label>Nombre y apellido</label>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>
                <div className="campo">
                  <label>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <h2 className="subtitulo">MÉTODO DE PAGO</h2>
              <div className="metodos">
                {[
                  ["credito", "💳 Tarjeta de crédito"],
                  ["debito", "💳 Tarjeta de débito"],
                  ["mp", "🟦 Mercado Pago"],
                ].map(([v, t]) => (
                  <label className="metodo" key={v}>
                    <input
                      type="radio"
                      name="metodoPago"
                      value={v}
                      checked={metodo === v}
                      onChange={(e) => setMetodo(e.target.value)}
                    />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
              {metodo && metodo !== "mp" && (
                <div className="panel-pago">
                  <div className="campo">
                    <label>Número de tarjeta (de prueba)</label>
                    <input
                      value={tarjetaNumero}
                      onChange={(e) =>
                        setTarjetaNumero(
                          e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 16)
                            .replace(/(.{4})/g, "$1 ")
                            .trim(),
                        )
                      }
                      placeholder="0000 0000 0000 0000"
                    />
                  </div>
                  <div className="campo">
                    <label>Titular de la tarjeta</label>
                    <input
                      value={tarjetaTitular}
                      onChange={(e) => setTarjetaTitular(e.target.value)}
                    />
                  </div>
                  <div className="form-fila">
                    <div className="campo">
                      <label>Vencimiento</label>
                      <input
                        value={tarjetaVence}
                        onChange={(e) => {
                          let x = e.target.value.replace(/\D/g, "").slice(0, 4);
                          if (x.length > 2)
                            x = x.slice(0, 2) + "/" + x.slice(2);
                          setTarjetaVence(x);
                        }}
                        placeholder="MM/AA"
                      />
                    </div>
                    <div className="campo">
                      <label>Código de seguridad</label>
                      <input
                        type="password"
                        value={tarjetaCvv}
                        onChange={(e) =>
                          setTarjetaCvv(
                            e.target.value.replace(/\D/g, "").slice(0, 4),
                          )
                        }
                        placeholder="CVV"
                      />
                    </div>
                  </div>
                  <p className="nota-demo">
                    Formulario de demostración: no se cobra nada y los datos de la tarjeta no
                    se guardan. Para probar podés usar 4242 4242 4242 4242,
                    cualquier fecha futura y cualquier CVV.
                  </p>
                </div>
              )}
              {metodo === "mp" && (
                <div className="panel-pago">
                  <p>
                    Al continuar te llevamos a <strong>Mercado Pago</strong>{" "}
                    para completar el pago de forma segura.
                  </p>
                </div>
              )}
              <p className="error-compra">{errorPago}</p>
            </div>
          )}
          {paso === 4 && compraFinal && (
            <div className="confirmacion">
              <h1 className="paso-titulo centrado">¡COMPRA CONFIRMADA! 🎉</h1>
              <p className="conf-sub">
                Mostrá este código QR en el cine para ingresar a tu función
              </p>
              {nivelNuevo && (
                <p className="conf-nivel">
                  🏆 ¡Con esta compra pasaste a nivel{" "}
                  {NIVELES[nivelNuevo].nombre}! {NIVELES[nivelNuevo].beneficio}.
                </p>
              )}
              <div className="ticket">
                <div className="ticket-qr">
                  <canvas ref={qrRef}></canvas>
                </div>
                <div className="ticket-datos">
                  <div className="t-pelicula">{compraFinal.pelicula}</div>
                  <div>
                    <small>Función</small>
                    {compraFinal.dia} {compraFinal.fecha} · {compraFinal.hora}{" "}
                    hs · Sala {compraFinal.formato}
                  </div>
                  <div>
                    <small>Butacas ({compraFinal.cantidad})</small>
                    {compraFinal.butacas.join(", ")}
                  </div>
                  <div>
                    <small>Total pagado</small>
                    {formatearPrecio(compraFinal.total)} ·{" "}
                    {compraFinal.metodoPago}
                  </div>
                  {compraFinal.descuento && (
                    <div>
                      <small>Descuento</small>
                      {compraFinal.descuento}
                    </div>
                  )}
                  <div>
                    <small>Código de reserva</small>
                    <span className="t-codigo">{compraFinal.codigo}</span>
                  </div>
                </div>
              </div>
              <div className="conf-botones">
                <button className="btn-secundario" onClick={descargarQR}>
                  Descargar QR
                </button>
                <Link to="/" className="btn-principal">
                  Volver al inicio
                </Link>
              </div>
            </div>
          )}
        </section>
        {paso < 4 && (
          <aside className="resumen">
            <div className="resumen-scroll">
              <h2 className="resumen-titulo">RESUMEN</h2>
              <div>
                <div className="res-bloque">
                  <div className="res-item">
                    <div className="res-icono">🎬</div>
                    <div className="res-texto">
                      <strong>{funcion.pelicula}</strong>
                      <span>
                        {funcion.dia} {funcion.fecha} · {funcion.hora} ·{" "}
                        {funcion.formato}
                      </span>
                    </div>
                  </div>
                  {paso >= 2 && (
                    <div className="res-item">
                      <div className="res-icono">💺</div>
                      <div className="res-texto">
                        <strong>
                          {butacas.length
                            ? butacas.join(", ")
                            : "Todavía no elegiste"}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
                <div className="res-bloque">
                  <div className="res-linea">
                    <span>Subtotal</span>
                    <span>{formatearPrecio(calculo.subtotal)}</span>
                  </div>
                  {calculo.promo && (
                    <div className="res-linea descuento">
                      <span>{calculo.promo.nombre}</span>
                      <span>−{formatearPrecio(calculo.promo.ahorro)}</span>
                    </div>
                  )}
                  {calculo.gratis && (
                    <div className="res-linea descuento">
                      <span>{calculo.gratis.cantidad} entrada(s) gratis</span>
                      <span>−{formatearPrecio(calculo.gratis.ahorro)}</span>
                    </div>
                  )}
                  <div className="res-linea total">
                    <span>Total</span>
                    <span>{formatearPrecio(calculo.total)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="resumen-barra">
              <div className="barra-total">
                <span className="barra-icono">🛍️</span>
                <span>{formatearPrecio(calculo.total)}</span>
              </div>
              <button
                id="btnContinuar"
                disabled={paso === 2 && butacas.length !== cantidad}
                onClick={continuar}
              >
                {paso === 3
                  ? metodo === "mp"
                    ? "PAGAR CON MERCADO PAGO"
                    : `PAGAR ${formatearPrecio(calculo.total)}`
                  : "CONTINUAR"}
              </button>
            </div>
          </aside>
        )}
      </div>
      {modalTiempo && (
        <div className="modal" style={{ display: "flex" }}>
          <div className="modal-content">
            <h2 className="modal-titulo">⏰ Se acabó el tiempo</h2>
            <p className="modal-texto">
              Tu reserva venció y las butacas se liberaron. Podés volver a
              elegir tu función.
            </p>
            <button
              className="btn-principal"
              onClick={() => {
                localStorage.removeItem("compraEnCurso");
                localStorage.removeItem("reservaVence");
                navigate("/");
              }}
            >
              Volver a la película
            </button>
          </div>
        </div>
      )}
      {procesando && (
        <div className="modal" style={{ display: "flex" }}>
          <div className="modal-content loading-content">
            <div className="loading-ticket">🎟️</div>
            <h2>Procesando tu pago</h2>
            <p>Por favor, no cierres esta ventana</p>
            <div className="loading-spinner"></div>
            <div className="loading-text">CARGANDO...</div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Compra;
