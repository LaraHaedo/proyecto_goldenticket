
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

    // --------------------------------------------------
// PROCESAR COMPRA DE ENTRADAS
// --------------------------------------------------

const entradaRef = db
  .collection("preferencias_entradas")
  .doc(preferenceId);

const entradaDoc = await entradaRef.get();

if (entradaDoc.exists) {
  const datos = entradaDoc.data();

  if (datos.uid !== uid) {
    return res.status(400).json({ error: "Usuario incorrecto" });
  }

  if (
    pago.currency_id !== "ARS" ||
    Number(pago.transaction_amount) !== Number(datos.total)
  ) {
    return res.status(400).json({ error: "Importe incorrecto" });
  }

  const funcionRef = db.collection("horarios").doc(datos.funcionId);
  const usuarioRef = db.collection("usuarios").doc(uid);
  const compraRef = db.collection("compras_entradas").doc(datos.compraId);
  const pagoEntradaRef = db.collection("pagos_entradas").doc(String(pago.id));

  const resultado = await db.runTransaction(async (tx) => {
    const pagoDoc = await tx.get(pagoEntradaRef);

    if (pagoDoc.exists) return "ya_procesado";

    const funcionDoc = await tx.get(funcionRef);
    const usuarioDoc = await tx.get(usuarioRef);
    const preferenciaActual = await tx.get(entradaRef);

    if (!funcionDoc.exists || !usuarioDoc.exists || !preferenciaActual.exists) {
      throw new Error("No se encontró la función, usuario o preferencia");
    }

    const funcion = funcionDoc.data();
    const usuario = usuarioDoc.data();
    const ocupadas = funcion.butacasOcupadas || [];

    if (
      funcion.formato !== "2D" ||
      datos.butacas.some((b) => ocupadas.includes(b)) ||
      Number(funcion.disponibles) < datos.cantidad
    ) {
      tx.update(entradaRef, {
        estado: "conflicto_butacas",
        pagoMP: String(pago.id),
        actualizadoEn: FieldValue.serverTimestamp(),
      });

      tx.set(pagoEntradaRef, {
        uid,
        estado: "aprobado_sin_butacas",
        preferenciaMP: preferenceId,
        procesadoEn: FieldValue.serverTimestamp(),
      });

      return "conflicto";
    }

    const compras = Number(usuario.compras || 0) + 1;
    const usadas = usuario.gratis?.mes === datos.mes
      ? Number(usuario.gratis.cantidad || 0)
      : 0;

    tx.update(funcionRef, {
      butacasOcupadas: [...ocupadas, ...datos.butacas],
      disponibles: Number(funcion.disponibles) - datos.cantidad,
    });

    tx.update(usuarioRef, {
      compras,
      ...(datos.gratis > 0
        ? { gratis: { mes: datos.mes, cantidad: usadas + datos.gratis } }
        : {}),
      actualizadoEn: FieldValue.serverTimestamp(),
    });

    tx.set(compraRef, {
      uid,
      pelicula: funcion.pelicula,
      funcionId: datos.funcionId,
      fecha: funcion.fecha,
      hora: funcion.hora,
      formato: "2D",
      sala: "Sala única",
      butacas: datos.butacas,
      cantidad: datos.cantidad,
      subtotal: datos.subtotal,
      total: datos.total,
      nivel: datos.nivel,
      metodoPago: "Mercado Pago",
      estado: "aprobada",
      pagoMP: String(pago.id),
      creadoEn: FieldValue.serverTimestamp(),
    });

    tx.set(pagoEntradaRef, {
      uid,
      compraId: datos.compraId,
      preferenciaMP: preferenceId,
      importe: Number(pago.transaction_amount),
      moneda: "ARS",
      estado: "aprobado",
      procesadoEn: FieldValue.serverTimestamp(),
    });

    tx.update(entradaRef, {
      estado: "pagada",
      pagoMP: String(pago.id),
      actualizadoEn: FieldValue.serverTimestamp(),
    });

    return "procesado";
  });

  console.log("Resultado del pago de entradas:", resultado);

  return res.status(200).json({
    recibido: true,
    procesado: resultado === "procesado",
    resultado,
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
// COMPRAS DE ENTRADAS - TARJETA DE DEMOSTRACIÓN
// --------------------------------------------------

app.post("/api/entradas/demo", verificarUsuario, async (req, res) => {
  try {
    if (
      process.env.NODE_ENV === "production" ||
      process.env.ENABLE_DEMO_CHECKOUT !== "true"
    ) {
      return res.status(403).json({ error: "Demo no habilitada" });
    }

    const uid = req.usuario.uid;
    const { funcionId, butacas } = req.body;

    if (
      !funcionId ||
      !Array.isArray(butacas) ||
      butacas.length < 1 ||
      butacas.length > 10 ||
      new Set(butacas).size !== butacas.length
    ) {
      return res.status(400).json({ error: "Datos de compra inválidos" });
    }

    const validas = butacas.every((b) => /^[A-H](?:[1-9]|1[0-5])$/.test(b));
    if (!validas) {
      return res.status(400).json({ error: "Butacas inválidas" });
    }

    const funcionRef = db.collection("horarios").doc(funcionId);
    const usuarioRef = db.collection("usuarios").doc(uid);
    const compraRef = db.collection("compras_entradas").doc();

    const resultado = await db.runTransaction(async (tx) => {
      const funcionDoc = await tx.get(funcionRef);
      const usuarioDoc = await tx.get(usuarioRef);

      if (!funcionDoc.exists || !usuarioDoc.exists) {
        throw new Error("No se encontró la función o el usuario");
      }

      const funcion = funcionDoc.data();
      const usuario = usuarioDoc.data();
      const ocupadas = funcion.butacasOcupadas || [];

      if (funcion.formato !== "2D" || Number(funcion.precio) !== 9000) {
        throw new Error("La función no cumple con la configuración 2D");
      }

      if (butacas.some((b) => ocupadas.includes(b))) {
        throw new Error("Una o más butacas ya están ocupadas");
      }

      if (Number(funcion.disponibles) < butacas.length) {
        throw new Error("No hay suficientes butacas disponibles");
      }

      const plan = String(usuario.plan || "bronze").toLowerCase();
      const nivel = {
        bronze: "bronce",
        silver: "plata",
        golden: "dorado",
        bronce: "bronce",
        plata: "plata",
        dorado: "dorado",
      }[plan] || "bronce";

      const cantidad = butacas.length;
      const subtotal = cantidad * 9000;
      const fecha = new Date(`${funcion.fecha}T12:00:00`);
      const dia = fecha.toLocaleDateString("es-AR", { weekday: "long" })
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      const lunesAMiercoles = ["lunes", "martes", "miercoles"].includes(dia);
      const lunesAJueves = lunesAMiercoles || dia === "jueves";
      const opciones = [subtotal];

      if (lunesAMiercoles) opciones.push(Math.ceil(cantidad / 2) * 9000);

      if ((nivel === "plata" || nivel === "dorado") && lunesAJueves) {
        opciones.push((Math.floor(cantidad / 4) * 2 + cantidad % 4) * 9000);
      }

      if (nivel === "dorado") opciones.push(Math.round(subtotal * 0.8));

      let total = Math.min(...opciones);
      let gratis = 0;

      const mes = funcion.fecha.slice(0, 7);
      const usadas = usuario.gratis?.mes === mes
        ? Number(usuario.gratis.cantidad || 0)
        : 0;

      if (nivel === "dorado") {
        gratis = Math.min(Math.max(0, 2 - usadas), cantidad);
        total -= Math.round(total / cantidad * gratis);
      }

      const nuevasOcupadas = [...ocupadas, ...butacas];
      const compras = Number(usuario.compras || 0) + 1;

      tx.update(funcionRef, {
        butacasOcupadas: nuevasOcupadas,
        disponibles: Number(funcion.disponibles) - cantidad,
      });

      tx.update(usuarioRef, {
        compras,
        ...(gratis > 0 ? { gratis: { mes, cantidad: usadas + gratis } } : {}),
        actualizadoEn: FieldValue.serverTimestamp(),
      });

      tx.set(compraRef, {
        uid,
        pelicula: funcion.pelicula,
        funcionId,
        fecha: funcion.fecha,
        hora: funcion.hora,
        formato: "2D",
        sala: "Sala única",
        butacas,
        cantidad,
        subtotal,
        total,
        nivel,
        metodoPago: "Tarjeta de demostración",
        estado: "aprobada",
        creadoEn: FieldValue.serverTimestamp(),
      });

      return { total, subtotal, nivel, compras };
    });

    return res.json({
      correcto: true,
      compraId: compraRef.id,
      ...resultado,
    });
  } catch (error) {
    console.error("Error en compra demo:", error);
    return res.status(400).json({ error: error.message });
  }
});

// --------------------------------------------------
// CHECKOUT MERCADO PAGO - ENTRADAS
// --------------------------------------------------

app.post("/api/entradas/mercadopago", verificarUsuario, async (req, res) => {
  try {
    if (
      process.env.NODE_ENV === "production" ||
      process.env.ENABLE_DEMO_CHECKOUT !== "true"
    ) {
      return res.status(403).json({ error: "Checkout de prueba no habilitado" });
    }

    if (!preference || !BACKEND_URL || !FRONTEND_URL.length) {
      return res.status(500).json({ error: "Falta configurar Mercado Pago" });
    }

    const uid = req.usuario.uid;
    const { funcionId, butacas } = req.body;

    if (
      !funcionId ||
      !Array.isArray(butacas) ||
      butacas.length < 1 ||
      butacas.length > 10 ||
      new Set(butacas).size !== butacas.length ||
      !butacas.every((b) => /^[A-H](?:[1-9]|1[0-5])$/.test(b))
    ) {
      return res.status(400).json({ error: "Datos de compra inválidos" });
    }

    const funcionRef = db.collection("horarios").doc(funcionId);
    const usuarioRef = db.collection("usuarios").doc(uid);

    const [funcionDoc, usuarioDoc] = await Promise.all([
      funcionRef.get(),
      usuarioRef.get(),
    ]);

    if (!funcionDoc.exists || !usuarioDoc.exists) {
      return res.status(404).json({ error: "Función o usuario inexistente" });
    }

    const funcion = funcionDoc.data();
    const usuario = usuarioDoc.data();

    if (funcion.formato !== "2D" || Number(funcion.precio) !== 9000) {
      return res.status(400).json({ error: "La función no es válida" });
    }

    const ocupadas = funcion.butacasOcupadas || [];

    if (
      butacas.some((b) => ocupadas.includes(b)) ||
      Number(funcion.disponibles) < butacas.length
    ) {
      return res.status(409).json({ error: "Una butaca ya no está disponible" });
    }

    const plan = String(usuario.plan || "bronze").toLowerCase();
    const nivel = {
      bronze: "bronce", silver: "plata", golden: "dorado",
      bronce: "bronce", plata: "plata", dorado: "dorado",
    }[plan] || "bronce";

    const cantidad = butacas.length;
    const subtotal = cantidad * 9000;
    const fecha = new Date(`${funcion.fecha}T12:00:00`);
    const dia = fecha.toLocaleDateString("es-AR", { weekday: "long" })
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const lunesAMiercoles = ["lunes", "martes", "miercoles"].includes(dia);
    const lunesAJueves = lunesAMiercoles || dia === "jueves";
    const opciones = [subtotal];

    if (lunesAMiercoles) opciones.push(Math.ceil(cantidad / 2) * 9000);

    if ((nivel === "plata" || nivel === "dorado") && lunesAJueves) {
      opciones.push((Math.floor(cantidad / 4) * 2 + cantidad % 4) * 9000);
    }

    if (nivel === "dorado") opciones.push(Math.round(subtotal * 0.8));

    let total = Math.min(...opciones);
    const mes = funcion.fecha.slice(0, 7);
    const usadas = usuario.gratis?.mes === mes ? Number(usuario.gratis.cantidad || 0) : 0;
    const gratis = nivel === "dorado" ? Math.min(Math.max(0, 2 - usadas), cantidad) : 0;

    if (gratis > 0) total -= Math.round(total / cantidad * gratis);

    const compraId = db.collection("compras_entradas").doc().id;

    const resultado = await preference.create({
      body: {
        items: [{
          id: compraId,
          title: `GoldenTicket - ${funcion.pelicula}`,
          description: `${cantidad} entrada(s) 2D - Butacas ${butacas.join(", ")}`,
          quantity: 1,
          currency_id: "ARS",
          unit_price: total,
        }],
        external_reference: uid,
        metadata: {
          tipo: "entradas",
          uid,
          compraId,
          funcionId,
        },
        back_urls: {
          success: `${FRONTEND_URL[0]}/compra?status=approved`,
          failure: `${FRONTEND_URL[0]}/compra?status=rejected`,
          pending: `${FRONTEND_URL[0]}/compra?status=pending`,
        },
        
        notification_url: `${BACKEND_URL}/api/webhooks/mercadopago`,
      },
    });

    if (!resultado.sandbox_init_point) {
      return res.status(500).json({ error: "Mercado Pago no devolvió el checkout de prueba" });
    }

    await db.collection("preferencias_entradas").doc(String(resultado.id)).set({
      uid,
      compraId,
      funcionId,
      butacas,
      cantidad,
      subtotal,
      total,
      nivel,
      gratis,
      mes,
      preferenciaMP: String(resultado.id),
      estado: "creada",
      creadoEn: FieldValue.serverTimestamp(),
    });

    return res.json({ correcto: true, url: resultado.sandbox_init_point , compraId });
  } catch (error) {
    console.error("Error creando checkout de entradas:", error);
    return res.status(500).json({ error: "No se pudo iniciar el pago" });
  }
});

app.get("/api/entradas/estado/:compraId", verificarUsuario, async (req, res) => {
  try {
    const { compraId } = req.params;

    const compraRef = db.collection("compras_entradas").doc(compraId);
    const compraSnap = await compraRef.get();

    if (compraSnap.exists) {
      const compra = compraSnap.data();

      if (compra.uid !== req.usuario.uid) {
        return res.status(403).json({
          error: "No tenés permiso para consultar esta compra."
        });
      }

      const usuarioSnap = await db
        .collection("usuarios")
        .doc(req.usuario.uid)
        .get();

      const perfil = usuarioSnap.exists ? usuarioSnap.data() : {};

      return res.json({
        estado: "pagada",
        compraId,
        total: compra.total,
        subtotal: compra.subtotal,
        compras: perfil.compras || 0,
      });
    }

    const preferencias = await db
      .collection("preferencias_entradas")
      .where("compraId", "==", compraId)
      .limit(1)
      .get();

    if (preferencias.empty) {
      return res.status(404).json({ error: "No se encontró la compra." });
    }

    const preferencia = preferencias.docs[0].data();

    if (preferencia.uid !== req.usuario.uid) {
      return res.status(403).json({ error: "No tenés permiso para consultar esta compra." });
    }

    return res.json({ estado: preferencia.estado || "pendiente", compraId });
  } catch (error) {
    console.error("Error consultando compra:", error);
    return res.status(500).json({ error: "No se pudo consultar el estado de la compra." });
  }
});

// --------------------------------------------------
// INICIAR SERVIDOR
// --------------------------------------------------
app.listen(PORT, () => {
  console.log(`GoldenTicket backend funcionando en puerto ${PORT}`);
});
