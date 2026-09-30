import { Fragment, useEffect, useState } from "react";

const CAMPOS_VACIOS = {
  nombre: "",
  email: "",
  numeroTarjeta: "",
  titular: "",
  vencimiento: "",
  cvv: "",
};

const METODOS = [
  { valor: "tarjeta", etiqueta: "💳 Tarjeta de Crédito / Débito" },
  { valor: "mp", etiqueta: "💙 Mercado Pago" },
  { valor: "efectivo", etiqueta: "💵 Efectivo en Boletería" },
];

function ModalPlan({ plan, abierto, onCerrar }) {
  // Estados (Clase 8 y 9)
  const [formulario, setFormulario] = useState(CAMPOS_VACIOS);
  const [metodoPago, setMetodoPago] = useState("tarjeta");
  const [confirmado, setConfirmado] = useState(false);
  const [error, setError] = useState("");

  // Cada vez que se abre el modal, empezamos con todo limpio
  useEffect(() => {
    if (abierto) {
      setFormulario(CAMPOS_VACIOS);
      setMetodoPago("tarjeta");
      setConfirmado(false);
      setError("");
    }
  }, [abierto, plan]);

  if (!plan) return null;

  const esGratis = plan.id === "bronze";

  // Actualiza un solo campo del formulario
  const cambiarCampo = (campo, valor) => {
    setFormulario({ ...formulario, [campo]: valor });
  };

  // Formatos automáticos para que escriba más cómodo
  const cambiarNumeroTarjeta = (valor) => {
    const soloNumeros = valor.replace(/\D/g, "").slice(0, 16);
    cambiarCampo("numeroTarjeta", soloNumeros.replace(/(.{4})/g, "$1 ").trim());
  };

  const cambiarVencimiento = (valor) => {
    const soloNumeros = valor.replace(/\D/g, "").slice(0, 4);
    const conBarra =
      soloNumeros.length > 2
        ? soloNumeros.slice(0, 2) + "/" + soloNumeros.slice(2)
        : soloNumeros;
    cambiarCampo("vencimiento", conBarra);
  };

  // Validaciones (Clase 9). Devuelve el mensaje de error o "" si está todo bien
  const validar = () => {
    if (esGratis) {
      if (formulario.nombre.trim() === "" || formulario.email.trim() === "") {
        return "Completá tu nombre y tu correo electrónico.";
      }
      if (!formulario.email.includes("@")) {
        return "El correo electrónico no es válido.";
      }
      return "";
    }

    if (metodoPago === "tarjeta") {
      if (
        formulario.numeroTarjeta.trim() === "" ||
        formulario.titular.trim() === "" ||
        formulario.vencimiento.trim() === "" ||
        formulario.cvv.trim() === ""
      ) {
        return "Completá todos los datos de la tarjeta.";
      }
      if (formulario.numeroTarjeta.replace(/\s/g, "").length < 13) {
        return "El número de tarjeta no es válido.";
      }
      if (formulario.vencimiento.length !== 5) {
        return "El vencimiento debe tener el formato MM/AA.";
      }
      if (formulario.cvv.length < 3) {
        return "El CVV debe tener al menos 3 números.";
      }
    }
    return "";
  };

  const procesarPago = () => {
    const mensaje = validar();
    if (mensaje !== "") {
      setError(mensaje);
      return;
    }
    setError("");
    setConfirmado(true);
  };

  return (
    <div className={`modal-overlay ${abierto ? "active" : ""}`}>
      <div className={`modal-card theme-${plan.id}`}>
        {confirmado ? (
          // ---------- PANTALLA FINAL ----------
          <>
            <div className="modal-icon">🎉</div>
            <h2>{esGratis ? "¡REGISTRO COMPLETADO!" : "¡SUSCRIPCIÓN CONFIRMADA!"}</h2>
            <p>
              {esGratis
                ? "¡Bienvenido a Golden Ticket! Tu plan Bronze ya está activo. Presentá tu DNI en boletería o usalo desde la App."
                : `¡Felicidades! Ya estás suscrito al plan ${plan.nombre}. Podrás usar tus beneficios de inmediato presentando tu DNI o desde la App.`}
            </p>
            <div className="modal-actions">
              <button className="modal-close-btn" onClick={onCerrar}>CERRAR</button>
            </div>
          </>
        ) : (
          // ---------- FORMULARIO ----------
          <>
            <div className="modal-icon">{plan.modal.icono}</div>
            <h2>{plan.modal.titulo}</h2>
            <p>{plan.modal.texto}</p>

            {esGratis ? (
              // Registro gratis (Bronze)
              <div className="bronze-form-container">
                <p className="payment-title">
                  Completá tus datos para activar tu cuenta gratis:
                </p>
                <div className="form-group">
                  <label htmlFor="bronze-name">Nombre Completo</label>
                  <input
                    type="text"
                    id="bronze-name"
                    placeholder="Ej: Juan Pérez"
                    value={formulario.nombre}
                    onChange={(e) => cambiarCampo("nombre", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="bronze-email">Correo Electrónico</label>
                  <input
                    type="email"
                    id="bronze-email"
                    placeholder="ejemplo@email.com"
                    value={formulario.email}
                    onChange={(e) => cambiarCampo("email", e.target.value)}
                  />
                </div>
              </div>
            ) : (
              // Pasarela de pago (Silver y Golden)
              <div className="payment-section">
                <div className="price-box">
                  <span className="price-label">Monto a abonar:</span>
                  <span className="price-amount">{plan.modal.precio}</span>
                </div>

                <div className="payment-options">
                  <p className="payment-title">Seleccioná un medio de pago:</p>
                  <div className="payment-methods">
                    {METODOS.map((metodo) => (
                      <Fragment key={metodo.valor}>
                        <label
                          className={`payment-method ${metodoPago === metodo.valor ? "selected" : ""}`}
                        >
                          <input
                            type="radio"
                            name="payment"
                            value={metodo.valor}
                            checked={metodoPago === metodo.valor}
                            onChange={() => setMetodoPago(metodo.valor)}
                          />
                          <span>{metodo.etiqueta}</span>
                        </label>

                        {/* El formulario de tarjeta aparece debajo de la opción "tarjeta" */}
                        {metodo.valor === "tarjeta" && metodoPago === "tarjeta" && (
                          <div className="card-form-container">
                            <div className="form-group">
                              <label htmlFor="card-number">Número de tarjeta</label>
                              <input
                                type="text"
                                id="card-number"
                                placeholder="1234 5678 9101 1121"
                                maxLength={19}
                                value={formulario.numeroTarjeta}
                                onChange={(e) => cambiarNumeroTarjeta(e.target.value)}
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor="card-holder">Nombre en la tarjeta</label>
                              <input
                                type="text"
                                id="card-holder"
                                placeholder="JUAN PEREZ"
                                value={formulario.titular}
                                onChange={(e) => cambiarCampo("titular", e.target.value)}
                              />
                            </div>
                            <div className="form-row">
                              <div className="form-group">
                                <label htmlFor="card-expiry">Vencimiento</label>
                                <input
                                  type="text"
                                  id="card-expiry"
                                  placeholder="MM/AA"
                                  maxLength={5}
                                  value={formulario.vencimiento}
                                  onChange={(e) => cambiarVencimiento(e.target.value)}
                                />
                              </div>
                              <div className="form-group">
                                <label htmlFor="card-cvv">CVV</label>
                                <input
                                  type="password"
                                  id="card-cvv"
                                  placeholder="123"
                                  maxLength={4}
                                  value={formulario.cvv}
                                  onChange={(e) =>
                                    cambiarCampo("cvv", e.target.value.replace(/\D/g, ""))
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && <p className="modal-error">{error}</p>}

            <div className="modal-actions">
              <button className="modal-pay-btn" onClick={procesarPago}>
                {esGratis ? "COMPLETAR REGISTRO" : "SUSCRIBIRME / ACTIVAR"}
              </button>
              <button className="modal-close-btn" onClick={onCerrar}>CANCELAR</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ModalPlan;
