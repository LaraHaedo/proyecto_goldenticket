
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

const { db, auth, FieldValue } = require("./firebaseAdmin");
const { MercadoPagoConfig, PreApproval } = require("mercadopago");

const app = express();

// ------------------------------------
// CONFIGURACIÓN
// ------------------------------------

const PORT = process.env.PORT || 3000;

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";
console.log("URL del frontend:", FRONTEND_URL);
console.log("URL de retorno MP:", `${FRONTEND_URL.replace(/\/+$/, "")}/planes`);

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const preApproval = new PreApproval(mpClient);

const planes = {
  silver: {
    nombre: "GoldenTicket Silver",
    precio: 7999,
  },
  golden: {
    nombre: "GoldenTicket Golden",
    precio: 11999,
  },
};

// ------------------------------------
// MIDDLEWARE
// ------------------------------------

app.use(cors({
  origin: FRONTEND_URL.split(",").map(url => url.trim()),
}));

app.use(express.json());

// ------------------------------------
// AUTENTICACIÓN FIREBASE
// ------------------------------------

async function verificarUsuario(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No estás autenticado",
      });
    }

    const token = authorization.split(" ")[1];
    req.usuario = await auth.verifyIdToken(token);

    next();
  } catch (error) {
    console.error("Error verificando Firebase:", error.message);

    return res.status(401).json({
      error: "La sesión no es válida. Volvé a iniciar sesión.",
    });
  }
}

// ------------------------------------
// VALIDACIÓN FIRMA MERCADO PAGO
// ------------------------------------

function validarFirmaMercadoPago(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;

  if (!secret) {
    console.error("Falta MP_WEBHOOK_SECRET");
    return false;
  }

  const signature = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];

  if (!signature || !requestId) return false;

  const partes = {};

  signature.split(",").forEach(parte => {
    const [clave, valor] = parte.trim().split("=");

    if (clave && valor) partes[clave] = valor;
  });

  const ts = partes.ts;
  const v1 = partes.v1;

  const dataId =
    req.query["data.id"] ||
    req.query.id ||
    req.body?.data?.id;

  if (!ts || !v1 || !dataId) return false;

  const manifest =
    `id:${String(dataId).toLowerCase()};` +
    `request-id:${requestId};` +
    `ts:${ts};`;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  try {
    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(v1, "hex");

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}

// ------------------------------------
// RUTA PRINCIPAL
// ------------------------------------

app.get("/", (req, res) => {
  res.send("Servidor de GoldenTicket funcionando");
});

// ------------------------------------
// PRUEBA FIREBASE
// ------------------------------------

app.get("/api/prueba-firebase", async (req, res) => {
  try {
    const prueba = await db.collection("usuarios").limit(1).get();

    res.json({
      conectado: true,
      mensaje: "Firebase conectado correctamente",
      documentosEncontrados: prueba.size,
    });
  } catch (error) {
    console.error("Error Firebase:", error);

    res.status(500).json({
      conectado: false,
      mensaje: "No se pudo conectar con Firebase",
    });
  }
});


// ------------------------------------
// ACTIVACIÓN DE PLAN CON FORMULARIO VISUAL
// SOLO PARA DESARROLLO LOCAL
// ------------------------------------

app.post(
  "/api/suscripciones/demo",
  verificarUsuario,
  async (req, res) => {
    try {
      // Esta modalidad debe estar deshabilitada en producción.
      if (
        process.env.NODE_ENV === "production" ||
        process.env.ENABLE_DEMO_CHECKOUT !== "true"
      ) {
        return res.status(403).json({
          error: "Esta modalidad no está disponible.",
        });
      }

      const { plan } = req.body;
      const uid = req.usuario.uid;

      if (!planes[plan]) {
        return res.status(400).json({
          error: "El plan seleccionado no es válido.",
        });
      }

      const usuarioRef = db.collection("usuarios").doc(uid);
      const usuarioDoc = await usuarioRef.get();

      if (!usuarioDoc.exists) {
        return res.status(404).json({
          error: "No encontramos tu usuario en GoldenTicket.",
        });
      }

      // No recibimos ni almacenamos datos de tarjeta.
      await usuarioRef.set({
        plan,
        estadoPlan: "activo",
        metodoPago: "demo_tarjeta",
        modoDemo: true,
        actualizadoEn: FieldValue.serverTimestamp(),
      }, { merge: true });

      return res.json({
        correcto: true,
        mensaje: "Plan activado en modo demostración.",
        plan,
      });

    } catch (error) {
      console.error("Error en activación demostrativa:", error);

      return res.status(500).json({
        error: "No se pudo activar el plan.",
      });
    }
  }
);

// ------------------------------------
// CREAR SUSCRIPCIÓN
// ------------------------------------

app.post("/api/suscripciones", verificarUsuario, async (req, res) => {
  try {
    const { plan } = req.body;
    const uid = req.usuario.uid;

    if (!planes[plan]) {
      return res.status(400).json({
        error: "El plan seleccionado no es válido",
      });
    }

    // Obtener el usuario desde Firestore
    const usuarioRef = db.collection("usuarios").doc(uid);
    const usuarioDoc = await usuarioRef.get();

    if (!usuarioDoc.exists) {
      return res.status(404).json({
        error: "No encontramos tu usuario en GoldenTicket",
      });
    }

    const datosUsuario = usuarioDoc.data();
    console.log("UID autenticado:", uid);
    console.log("Usuario encontrado en Firestore:", usuarioDoc.exists);
    console.log("Campos disponibles:", Object.keys(datosUsuario));
    console.log("Email de Firestore:", datosUsuario.email);
    console.log("Email de Firebase Auth:", req.usuario.email);
    const email = datosUsuario.email || req.usuario.email;

    if (!email) {
      return res.status(400).json({
        error: "Falta el email de tu cuenta. Revisá tu perfil de usuario.",
      });
    }

    const datosPlan = planes[plan];

    // Crear suscripción mensual en Mercado Pago
    const suscripcion = await preApproval.create({
      body: {
        reason: datosPlan.nombre,
        external_reference: uid,
        payer_email: email,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: datosPlan.precio,
          currency_id: "ARS",
        },
        back_url: `${FRONTEND_URL.replace(/\/+$/, "")}/planes`,
        status: "pending",
      },
    });

    if (!suscripcion.id || !suscripcion.init_point) {
      console.error("Respuesta inesperada de Mercado Pago:", suscripcion);

      throw new Error("Mercado Pago no devolvió el enlace de suscripción");
    }

    // Guardar la suscripción pendiente
    await usuarioRef.set({
      plan,
      estadoPlan: "pendiente",
      metodoPago: "mercado_pago",
      suscripcionMP: String(suscripcion.id),
      actualizadoEn: FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.json({
      id: suscripcion.id,
      url: suscripcion.init_point,
    });

  } catch (error) {
    console.error("Error creando suscripción:", error);

    return res.status(500).json({
      error: error.message || "No se pudo crear la suscripción",
    });
  }
});

// ------------------------------------
// WEBHOOK MERCADO PAGO
// ------------------------------------

app.post("/api/webhooks/mercadopago", async (req, res) => {
  try {
    console.log("Notificación recibida de Mercado Pago");

    if (!validarFirmaMercadoPago(req)) {
      console.error("Firma de Mercado Pago inválida");

      return res.status(401).json({
        error: "Firma de webhook inválida",
      });
    }

    const tipo = req.query.type || req.body.type;

    const dataId =
      req.query["data.id"] ||
      req.query.id ||
      req.body?.data?.id;

    console.log("Tipo de evento:", tipo);
    console.log("ID recibido:", dataId);

    if (tipo !== "subscription_preapproval") {
      return res.status(200).json({
        mensaje: "Evento recibido, sin procesamiento",
      });
    }

    if (!dataId) {
      return res.status(400).json({
        error: "Falta el ID de la suscripción",
      });
    }

    // Consultar la información real en Mercado Pago
    const suscripcion = await preApproval.get({
      id: String(dataId),
    });

    const uid = suscripcion.external_reference;

    if (!uid) {
      return res.status(200).json({
        mensaje: "Suscripción sin usuario asociado",
      });
    }

    // Comprobar que el plan y el monto sean correctos
    const planEncontrado = Object.entries(planes).find(
      ([clave, datos]) =>
        suscripcion.reason === datos.nombre &&
        Number(suscripcion.auto_recurring?.transaction_amount) === datos.precio &&
        suscripcion.auto_recurring?.currency_id === "ARS"
    );

    if (!planEncontrado) {
      console.error("Plan, monto o moneda no coinciden");

      return res.status(200).json({
        mensaje: "Suscripción no válida para GoldenTicket",
      });
    }

    const [plan] = planEncontrado;
    const usuarioRef = db.collection("usuarios").doc(uid);
    const usuarioDoc = await usuarioRef.get();

    if (!usuarioDoc.exists) {
      return res.status(200).json({
        mensaje: "Usuario no encontrado",
      });
    }

    const datosUsuario = usuarioDoc.data();

    // Ignorar suscripciones antiguas
    if (String(datosUsuario.suscripcionMP || "") !== String(dataId)) {
      return res.status(200).json({
        mensaje: "Suscripción anterior ignorada",
      });
    }

    const estado = suscripcion.status;

    if (estado === "authorized") {
      await usuarioRef.update({
        plan,
        estadoPlan: "activo",
        metodoPago: "mercado_pago",
        actualizadoEn: FieldValue.serverTimestamp(),
      });
    } else if (estado === "pending") {
      await usuarioRef.update({
        plan,
        estadoPlan: "pendiente",
        metodoPago: "mercado_pago",
        actualizadoEn: FieldValue.serverTimestamp(),
      });
    } else if (estado === "paused") {
      await usuarioRef.update({
        estadoPlan: "pausado",
        actualizadoEn: FieldValue.serverTimestamp(),
      });
    } else if (estado === "cancelled") {
      await usuarioRef.update({
        plan: "bronze",
        estadoPlan: "cancelado",
        metodoPago: "mercado_pago",
        actualizadoEn: FieldValue.serverTimestamp(),
      });
    }

    return res.status(200).json({
      mensaje: "Webhook procesado correctamente",
    });

  } catch (error) {
    console.error("Error procesando webhook:", error);

    return res.status(500).json({
      error: "Error procesando notificación",
    });
  }
});

// ------------------------------------
// INICIAR SERVIDOR
// ------------------------------------

const servidor = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
  console.log("Webhook disponible en /api/webhooks/mercadopago");
});

servidor.on("error", error => {
  console.error("Error del servidor:", error);
});
