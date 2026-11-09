
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");
const { db, auth, FieldValue } = require("./firebaseAdmin");

const app = express();
const PORT = process.env.PORT || 3000;

const FRONTEND_URL = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((url) => url.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const BACKEND_URL = (process.env.BACKEND_URL || "").replace(/\/+$/, "");

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;

// --------------------------------------------------
// CONFIGURACIÓN
// --------------------------------------------------

const PLANES = {
  bronze: {
    nombre: "Bronze",
    precio: 0,
  },
  silver: {
    nombre: "Silver",
    precio: 7999,
  },
  golden: {
    nombre: "Golden",
    precio: 11999,
  },
};

if (!MP_ACCESS_TOKEN) {
  console.error("Falta configurar MP_ACCESS_TOKEN en el .env");
}

if (!BACKEND_URL) {
  console.error("Falta configurar BACKEND_URL en el .env");
}

if (!MP_WEBHOOK_SECRET) {
  console.error("Falta configurar MP_WEBHOOK_SECRET en el .env");
}

if (!FRONTEND_URL.length) {
  console.error("Falta configurar FRONTEND_URL en el .env");
}

const mpClient = MP_ACCESS_TOKEN
  ? new MercadoPagoConfig({
      accessToken: MP_ACCESS_TOKEN,
    })
  : null;

const preference = mpClient ? new Preference(mpClient) : null;
const payment = mpClient ? new Payment(mpClient) : null;

// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------

app.use(
  cors({
    origin(origin, callback) {
      // Permite herramientas sin origen, como Postman.
      if (!origin) return callback(null, true);

      if (FRONTEND_URL.includes(origin.replace(/\/+$/, ""))) {
        return callback(null, true);
      }

      return callback(new Error("Origen no permitido por CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// --------------------------------------------------
// AUTENTICACIÓN FIREBASE
// --------------------------------------------------

async function verificarUsuario(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No se recibió el token de autenticación",
      });
    }

    const token = authorization.split(" ")[1];

    const usuario = await auth.verifyIdToken(token);

    req.usuario = usuario;

    next();
  } catch (error) {
    console.error("Error verificando usuario:", error.message);

    return res.status(401).json({
      error: "Token inválido o sesión vencida",
    });
  }
}

// --------------------------------------------------
// VALIDACIÓN DE FIRMA DE MERCADO PAGO
// --------------------------------------------------

function validarFirmaMercadoPago(req) {
  try {
    if (!MP_WEBHOOK_SECRET) return false;

    const signature = req.headers["x-signature"];
    const requestId = req.headers["x-request-id"];

    if (!signature || !requestId) return false;

    const dataId =
      req.query["data.id"] ||
      req.body?.data?.id ||
      req.body?.id;

    if (!dataId) return false;

    const partes = {};

    signature.split(",").forEach((parte) => {
      const [clave, valor] = parte.trim().split("=");

      if (clave && valor) {
        partes[clave] = valor;
      }
    });

    const timestamp = partes.ts;
    const firmaRecibida = partes.v1;

    if (!timestamp || !firmaRecibida) return false;

    const manifest =
      `id:${String(dataId).toLowerCase()};` +
      `request-id:${requestId};` +
      `ts:${timestamp};`;

    const firmaCalculada = crypto
      .createHmac("sha256", MP_WEBHOOK_SECRET)
      .update(manifest)
      .digest("hex");

    const recibida = Buffer.from(firmaRecibida, "hex");
    const calculada = Buffer.from(firmaCalculada, "hex");

    if (recibida.length !== calculada.length) return false;

    return crypto.timingSafeEqual(recibida, calculada);
  } catch (error) {
    console.error("Error validando firma:", error.message);
    return false;
  }
}

// --------------------------------------------------
// RUTA DE PRUEBA DEL SERVIDOR
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    mensaje: "Backend de GoldenTicket funcionando",
  });
});

// --------------------------------------------------
// PRUEBA DE FIREBASE
// --------------------------------------------------

app.get("/api/prueba-firebase", verificarUsuario, async (req, res) => {
  try {
    const usuarioRef = db.collection("usuarios").doc(req.usuario.uid);
    const usuarioDoc = await usuarioRef.get();

    return res.json({
      correcto: true,
      uid: req.usuario.uid,
      existeEnFirestore: usuarioDoc.exists,
      datos: usuarioDoc.exists ? usuarioDoc.data() : null,
    });
  } catch (error) {
    console.error("Error probando Firebase:", error);

    return res.status(500).json({
      error: "No se pudo consultar Firebase",
    });
  }
});

// --------------------------------------------------
// COMPRA DE CANDY: descuento de stock atómico en Firestore
// --------------------------------------------------
app.post("/api/candy/compra", verificarUsuario, async (req, res) => {
  try {
    const items = req.body?.items;
    if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
      return res.status(400).json({ error: "El carrito no es válido." });
    }

    const cantidades = new Map();
    for (const item of items) {
      const id = String(item?.id || "").trim();
      const cantidad = Number(item?.cantidad);
      if (!id || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 50) {
        return res.status(400).json({ error: "Hay un producto o cantidad inválida." });
      }
      cantidades.set(id, (cantidades.get(id) || 0) + cantidad);
    }

    const referencias = [...cantidades.keys()].map((id) => db.collection("candy").doc(id));
    const pedidoRef = db.collection("pedidos_candy").doc();
    let total = 0;
    const detallePedido = [];

    await db.runTransaction(async (transaction) => {
      // Firestore puede reintentar el callback; reiniciamos los acumuladores.
      total = 0;
      detallePedido.length = 0;
      const documentos = [];
      for (const referencia of referencias) {
        documentos.push(await transaction.get(referencia));
      }

      documentos.forEach((documento, indice) => {
        if (!documento.exists) throw new Error("Uno de los productos ya no existe.");
        const producto = documento.data();
        const cantidad = cantidades.get(documento.id);
        const stock = Number(producto.stock || 0);

        if (producto.activo === false) throw new Error(`${producto.nombre}: producto no disponible.`);
        if (stock < cantidad) throw new Error(`Stock insuficiente para ${producto.nombre}. Disponibles: ${stock}.`);

        const subtotal = Number(producto.precio) * cantidad;
        if (!Number.isFinite(subtotal) || subtotal < 0) throw new Error("Precio inválido.");
        total += subtotal;
        detallePedido.push({
          productoId: documento.id,
          nombre: producto.nombre,
          precio: Number(producto.precio),
          cantidad,
          subtotal,
        });
      });

      documentos.forEach((documento, indice) => {
        const cantidad = cantidades.get(documento.id);
        transaction.update(documento.ref, {
          stock: Number(documento.data().stock || 0) - cantidad,
          actualizadoEn: FieldValue.serverTimestamp(),
        });
      });

      transaction.set(pedidoRef, {
        uid: req.usuario.uid,
        items: detallePedido,
        total,
        estado: "confirmado",
        creadoEn: FieldValue.serverTimestamp(),
      });
    });

    return res.status(200).json({
      correcto: true,
      pedidoId: pedidoRef.id,
      total,
      mensaje: "Compra confirmada y stock actualizado.",
    });
  } catch (error) {
    console.error("Error en compra de Candy:", error);
    const conflicto = /stock insuficiente|no disponible|no existe|inválido/i.test(error.message);
    return res.status(conflicto ? 409 : 500).json({
      error: error.message || "No se pudo confirmar la compra.",
    });
  }
});

// --------------------------------------------------
// PAGO ÚNICO DE PRUEBA CON CHECKOUT PRO
// --------------------------------------------------

app.post("/api/suscripciones", verificarUsuario, async (req, res) => {
  try {
    // Esta ruta es exclusivamente para pruebas.
    if (
      process.env.NODE_ENV === "production" ||
      process.env.ENABLE_DEMO_CHECKOUT !== "true"
    ) {
      return res.status(403).json({
        error: "El checkout de demostración no está habilitado",
      });
    }

    if (!preference || !BACKEND_URL || !FRONTEND_URL.length) {
      return res.status(500).json({
        error: "Falta configurar Mercado Pago o las URLs del servidor",
      });
    }

    const { plan } = req.body;

    const planElegido = String(plan || "").toLowerCase();
    const datosPlan = PLANES[planElegido];

    if (!datosPlan || planElegido === "bronze") {
      return res.status(400).json({
        error: "El plan seleccionado no es válido",
      });
    }

    const uid = req.usuario.uid;

    // Guardamos la preferencia para poder verificar el pago
    // cuando Mercado Pago envíe la notificación.
    const resultado = await preference.create({
      body: {
        items: [
          {
            id: planElegido,
            title: `GoldenTicket - Plan ${datosPlan.nombre}`,
            description: "Pago único de prueba",
            quantity: 1,
            currency_id: "ARS",
            unit_price: datosPlan.precio,
          },
        ],

        external_reference: uid,

        metadata: {
          uid,
          plan: planElegido,
          modo_demo: true,
        },

        back_urls: {
          success: `${FRONTEND_URL[0]}/planes?estado=aprobado`,
          failure: `${FRONTEND_URL[0]}/planes?estado=rechazado`,
          pending: `${FRONTEND_URL[0]}/planes?estado=pendiente`,
        },

        auto_return: "approved",

        notification_url:
          `${BACKEND_URL}/api/webhooks/mercadopago`,
      },
    });

    // No usamos init_point como alternativa:
    // eso podría enviar al checkout de producción.
    if (!resultado.sandbox_init_point) {
      console.error(
        "Mercado Pago no devolvió sandbox_init_point:",
        resultado
      );

      return res.status(500).json({
        error:
          "Mercado Pago no devolvió una URL de pago de prueba. Revisá que el token sea de prueba.",
      });
    }

    // Guardamos la relación entre preferencia, usuario y plan.
    await db
      .collection("preferencias_demo")
      .doc(String(resultado.id))
      .set({
        uid,
        plan: planElegido,
        precio: datosPlan.precio,
        moneda: "ARS",
        preferenciaMP: String(resultado.id),
        estado: "creada",
        creadoEn: FieldValue.serverTimestamp(),
      });

    return res.json({
      correcto: true,
      url: resultado.sandbox_init_point,
      preferenciaId: resultado.id,
    });
  } catch (error) {
    console.error(
      "Error creando checkout:",
      error.message,
      error.cause || ""
    );

    return res.status(500).json({
      error: "No se pudo crear el pago de prueba",
      detalle: error.message,
    });
  }
});

// --------------------------------------------------
// WEBHOOK DE MERCADO PAGO
// --------------------------------------------------

app.post("/api/webhooks/mercadopago", async (req, res) => {
  try {
    // Primero validamos que la notificación sea auténtica.
    if (!validarFirmaMercadoPago(req)) {
      console.error("Webhook rechazado: firma inválida");

      return res.status(401).json({
        error: "Firma de Mercado Pago inválida",
      });
    }

    const tipo =
      req.query.type ||
      req.body?.type ||
      req.body?.action;

    const dataId =
      req.query["data.id"] ||
      req.body?.data?.id ||
      req.body?.id;

    if (tipo !== "payment" && !String(tipo || "").startsWith("payment.")) {
      return res.status(200).json({
        recibido: true,
        ignorado: true,
      });
    }

    if (!dataId || !payment) {
      return res.status(400).json({
        error: "No se recibió el identificador del pago",
      });
    }

    // Consultamos el pago directamente en Mercado Pago.
    const pago = await payment.get({
      id: dataId,
    });

    // Solo procesamos pagos aprobados.
    if (pago.status !== "approved") {
      return res.status(200).json({
        recibido: true,
        estado: pago.status,
        mensaje: "El pago todavía no está aprobado",
      });
    }

    // Impedimos activar planes con pagos reales.
    if (pago.live_mode !== false) {
      console.error("Se rechazó un pago que no es de prueba");

      return res.status(400).json({
        error: "El pago no pertenece al entorno de prueba",
      });
    }

    const uid = pago.external_reference;
    const preferenceId = String(pago.preference_id || "");

    if (!uid || !preferenceId) {
      return res.status(400).json({
        error: "El pago no contiene los datos necesarios",
      });
    }

    // Buscamos la preferencia que GoldenTicket creó.
    const preferenciaRef = db
      .collection("preferencias_demo")
      .doc(preferenceId);

    const preferenciaDoc = await preferenciaRef.get();

    if (!preferenciaDoc.exists) {
      return res.status(400).json({
        error: "No se encontró la preferencia original",
      });
    }

    const datosPreferencia = preferenciaDoc.data();

    // Comprobamos que coincidan usuario, plan e importe.
    if (datosPreferencia.uid !== uid) {
      return res.status(400).json({
        error: "El usuario del pago no coincide",
      });
    }

    if (pago.currency_id !== "ARS") {
      return res.status(400).json({
        error: "La moneda del pago no es válida",
      });
    }

    if (
      Number(pago.transaction_amount) !==
      Number(datosPreferencia.precio)
    ) {
      return res.status(400).json({
        error: "El importe del pago no coincide",
      });
    }

    const plan = datosPreferencia.plan;

    if (!PLANES[plan] || plan === "bronze") {
      return res.status(400).json({
        error: "El plan del pago no es válido",
      });
    }

    const pagoRef = db
      .collection("pagos_demo")
      .doc(String(pago.id));

    const usuarioRef = db.collection("usuarios").doc(uid);

    // Transacción: evita procesar dos veces el mismo pago.
    await db.runTransaction(async (transaction) => {
      const pagoDoc = await transaction.get(pagoRef);

      if (pagoDoc.exists) {
        return;
      }

      const usuarioDoc = await transaction.get(usuarioRef);

      if (!usuarioDoc.exists) {
        throw new Error("El usuario no existe en Firestore");
      }

      transaction.update(usuarioRef, {
        plan,
        estadoPlan: "activo",
        metodoPago: "mercado_pago",
        modoDemo: true,
        pagoDemoMP: String(pago.id),
        actualizadoEn: FieldValue.serverTimestamp(),
      });

      transaction.set(pagoRef, {
        uid,
        plan,
        importe: Number(pago.transaction_amount),
        moneda: pago.currency_id,
        pagoMP: String(pago.id),
        preferenciaMP: preferenceId,
        estado: "aprobado",
        modoDemo: true,
        procesadoEn: FieldValue.serverTimestamp(),
      });

      transaction.update(preferenciaRef, {
        estado: "pagada",
        pagoMP: String(pago.id),
        actualizadoEn: FieldValue.serverTimestamp(),
      });
    });

    console.log(
      `Pago de prueba ${pago.id} procesado para el usuario ${uid}`
    );

    return res.status(200).json({
      recibido: true,
      procesado: true,
    });
  } catch (error) {
    console.error("Error procesando webhook:", error);

    return res.status(500).json({
      error: "No se pudo procesar la notificación",
    });
  }
});

// --------------------------------------------------
// ACTIVACIÓN MANUAL DE DEMOSTRACIÓN
// Solo para desarrollo local.
// --------------------------------------------------

app.post(
  "/api/suscripciones/demo",
  verificarUsuario,
  async (req, res) => {
    try {
      if (
        process.env.NODE_ENV === "production" ||
        process.env.ENABLE_DEMO_CHECKOUT !== "true"
      ) {
        return res.status(403).json({
          error: "La demostración no está habilitada",
        });
      }

      const plan = String(req.body.plan || "").toLowerCase();

      if (!PLANES[plan] || plan === "bronze") {
        return res.status(400).json({
          error: "Plan inválido",
        });
      }

      const usuarioRef = db
        .collection("usuarios")
        .doc(req.usuario.uid);

      await usuarioRef.set(
        {
          plan,
          estadoPlan: "activo",
          metodoPago: "demo",
          modoDemo: true,
          actualizadoEn: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return res.json({
        correcto: true,
        mensaje: "Plan de demostración activado",
        plan,
      });
    } catch (error) {
      console.error("Error activando demo:", error);

      return res.status(500).json({
        error: "No se pudo activar el plan de demostración",
      });
    }
  }
);

// --------------------------------------------------
// INICIAR SERVIDOR
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(`GoldenTicket backend funcionando en puerto ${PORT}`);
});
