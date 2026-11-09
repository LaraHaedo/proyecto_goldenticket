
import { useEffect, useState } from "react";
import { auth } from "../firebase/config";

function ModalPlan({ plan, abierto, onCerrar }) {
  const [confirmado, setConfirmado] = useState(false);
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [metodo, setMetodo] = useState("tarjeta");

  const [titular, setTitular] = useState("");
  const [numero, setNumero] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [cvv, setCvv] = useState("");

  useEffect(() => {
    if (abierto) {
      setConfirmado(false);
      setError("");
      setProcesando(false);
      setMetodo("tarjeta");
      setTitular("");
      setNumero("");
      setVencimiento("");
      setCvv("");
    }
  }, [abierto, plan]);

  if (!plan) return null;

  const esGratis = plan.id === "bronze";

  const obtenerToken = async () => {
    const usuario = auth.currentUser;

    if (!usuario) {
      throw new Error("Tenés que iniciar sesión para contratar un plan.");
    }

    return await usuario.getIdToken();
  };

  const activarTarjetaVisual = async () => {
    const numeroLimpio = numero.replace(/\s/g, "");

    if (
      !titular.trim() ||
      numeroLimpio.length < 13 ||
      !/^\d+$/.test(numeroLimpio) ||
      !/^\d{2}\/\d{2}$/.test(vencimiento) ||
      !/^\d{3,4}$/.test(cvv)
    ) {
      throw new Error("Completá correctamente todos los campos.");
    }

    // Los datos de tarjeta solo se usan para validar el formulario.
    // Nunca se envían al backend ni se guardan.

    const token = await obtenerToken();

    const respuesta = await fetch(
      "http://localhost:3000/api/suscripciones/demo",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: plan.id,
        }),
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.error || "No se pudo activar el plan.");
    }

    setConfirmado(true);
  };

  const iniciarMercadoPago = async () => {
    const token = await obtenerToken();

    const respuesta = await fetch(
      "http://localhost:3000/api/suscripciones",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: plan.id,
        }),
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.error || "No se pudo crear la suscripción.");
    }

    if (!datos.url) {
      throw new Error("Mercado Pago no devolvió el enlace de pago.");
    }

    window.location.assign(datos.url);
  };

  const procesarPago = async () => {
    setError("");

    if (esGratis) {
      setConfirmado(true);
      return;
    }

    try {
      setProcesando(true);

      if (metodo === "tarjeta") {
        await activarTarjetaVisual();
      } else {
        await iniciarMercadoPago();
      }

    } catch (err) {
      console.error("Error procesando suscripción:", err);
      setError(err.message || "No se pudo procesar la solicitud.");
      setProcesando(false);
    }
  };

  return (
    <div className={`modal-overlay ${abierto ? "active" : ""}`}>
      <div className={`modal-card theme-${plan.id}`}>

        {confirmado ? (
          <>
            <div className="modal-icon">🎉</div>

            <h2>¡PLAN ACTIVADO!</h2>

            <p>
              Tu plan {plan.id.toUpperCase()} ya está activo en GoldenTicket.
            </p>

            {metodo === "tarjeta" && (
              <p>
                Activación demostrativa: no se realizó ningún cobro.
              </p>
            )}

            <div className="modal-actions">
              <button className="modal-close-btn" onClick={onCerrar}>
                CERRAR
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-icon">
              {plan.modal.icono}
            </div>

            <h2>{plan.modal.titulo}</h2>
            <p>{plan.modal.texto}</p>

            {esGratis ? (
              <div className="bronze-form-container">
                <p className="payment-title">
                  El plan Bronze es gratuito y está incluido en tu cuenta.
                </p>
              </div>
            ) : (
              <div className="payment-section">

                <div className="price-box">
                  <span className="price-label">
                    Suscripción mensual:
                  </span>

                  <span className="price-amount">
                    {plan.modal.precio}
                  </span>
                </div>

                <div className="payment-options">
                  <p className="payment-title">
                    Elegí cómo continuar:
                  </p>

                  <div className="payment-methods">
                    <button
                      type="button"
                      className={`payment-method ${metodo === "mercadopago" ? "selected" : ""}`}
                      onClick={() => setMetodo("mercadopago")}
                    >
                      💙 Mercado Pago
                    </button>

                    <button
                      type="button"
                      className={`payment-method ${metodo === "tarjeta" ? "selected" : ""}`}
                      onClick={() => setMetodo("tarjeta")}
                    >
                      💳 Tarjeta
                    </button>
                  </div>
                </div>

                {metodo === "tarjeta" ? (
                  <div className="card-form">
                    <p className="payment-title">
                      Datos de tarjeta
                    </p>

                    <p>
                      Formulario demostrativo: no procesa pagos reales.
                    </p>

                    <label htmlFor="titular">Nombre del titular</label>
                    <input
                      id="titular"
                      type="text"
                      autoComplete="off"
                      placeholder="Nombre como aparece en la tarjeta"
                      value={titular}
                      onChange={(e) => setTitular(e.target.value)}
                    />

                    <label htmlFor="numero">Número de tarjeta</label>
                    <input
                      id="numero"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="0000 0000 0000 0000"
                      maxLength={23}
                      value={numero}
                      onChange={(e) =>
                        setNumero(
                          e.target.value.replace(/[^\d\s]/g, "")
                        )
                      }
                    />

                    <div className="card-form-row">
                      <div>
                        <label htmlFor="vencimiento">
                          Vencimiento
                        </label>
                        <input
                          id="vencimiento"
                          type="text"
                          autoComplete="off"
                          placeholder="MM/AA"
                          maxLength={5}
                          value={vencimiento}
                          onChange={(e) => {
                            let valor = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 4);

                            if (valor.length > 2) {
                              valor =
                                valor.slice(0, 2) +
                                "/" +
                                valor.slice(2);
                            }

                            setVencimiento(valor);
                          }}
                        />
                      </div>

                      <div>
                        <label htmlFor="cvv">CVV</label>
                        <input
                          id="cvv"
                          type="password"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="123"
                          maxLength={4}
                          value={cvv}
                          onChange={(e) =>
                            setCvv(e.target.value.replace(/\D/g, ""))
                          }
                        />
                      </div>
                    </div>

                    <p className="demo-notice">
                      Este formulario es demostrativo. No ingreses datos
                      de una tarjeta real.
                    </p>
                  </div>
                ) : (
                  <div className="payment-options">
                    <p>
                      Vas a continuar al checkout seguro de Mercado Pago
                      para autorizar tu suscripción mensual.
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="modal-error">{error}</p>
            )}

            <div className="modal-actions">
              <button
                className="modal-pay-btn"
                onClick={procesarPago}
                disabled={procesando}
              >
                {procesando
                  ? "PROCESANDO..."
                  : esGratis
                  ? "ENTENDIDO"
                  : "SUSCRIBIRME"}
              </button>

              <button
                className="modal-close-btn"
                onClick={onCerrar}
                disabled={procesando}
              >
                CANCELAR
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ModalPlan;
