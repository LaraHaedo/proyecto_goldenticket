import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/config";
import "../estilos/admin.css";
import { planes as planesIniciales } from "../datos/planes";

const SECCIONES = {
  peliculas: { titulo: "Películas", campos: [{ key: "titulo", label: "Título" }, { key: "descripcion", label: "Descripción" }, { key: "genero", label: "Género" }, { key: "duracion", label: "Duración (minutos)", type: "number" }, { key: "imagen", label: "URL de imagen" }] },
  horarios: { titulo: "Horarios", campos: [{ key: "pelicula", label: "Película" }, { key: "fecha", label: "Fecha", type: "date" }, { key: "hora", label: "Hora", type: "time" }, { key: "sala", label: "Sala" }, { key: "precio", label: "Precio", type: "number" }, { key: "disponibles", label: "Entradas disponibles", type: "number" }] },
  candy: { titulo: "Candy y stock", campos: [
    { key: "codigo", label: "Código" },
    { key: "nombre", label: "Producto" },
    { key: "nombreCarrito", label: "Nombre en el carrito" },
    { key: "categoria", label: "Categoría (combos, pochoclos, bebidas, golosinas, snacks)" },
    { key: "estilo", label: "Estilo (bronze, silver, golden)" },
    { key: "descripcion", label: "Descripción" },
    { key: "detalles", label: "Detalles (separados por coma)" },
    { key: "precio", label: "Precio", type: "number" },
    { key: "stock", label: "Stock disponible", type: "number" },
    { key: "imagen", label: "URL/ruta de imagen" },
    { key: "badge", label: "Etiqueta (opcional)" },
    { key: "activo", label: "Activo (true/false)" }
  ] },
  planes: { titulo: "Planes", campos: [
    { key: "nombre", label: "Nombre del plan" },
    { key: "numero", label: "Número" },
    { key: "requisito", label: "Requisito" },
    { key: "precio", label: "Precio" },
    { key: "desbloqueo", label: "Desbloqueo" },
    { key: "beneficiosTexto", label: "Beneficios (uno por línea: emoji|texto)", type: "textarea" },
    { key: "modalIcono", label: "Ícono del mensaje" },
    { key: "modalTitulo", label: "Título del mensaje" },
    { key: "modalTexto", label: "Texto del mensaje", type: "textarea" },
    { key: "modalPrecio", label: "Precio mostrado en el mensaje" }
  ] },
};

function Admin() {
  const navigate = useNavigate();
  const [comprobando, setComprobando] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [seccion, setSeccion] = useState("peliculas");
  const [registros, setRegistros] = useState([]);
  const [formulario, setFormulario] = useState({});
  const [editando, setEditando] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => onAuthStateChanged(auth, async (usuario) => {
    if (!usuario) { setAdmin(false); setComprobando(false); navigate("/login"); return; }
    try {
      const { getDoc } = await import("firebase/firestore");
      const perfil = await getDoc(doc(db, "usuarios", usuario.uid));
      const esAdmin = perfil.exists() && perfil.data().rol === "admin";
      setAdmin(esAdmin);
      if (!esAdmin) navigate("/");
    } catch { setAdmin(false); navigate("/"); }
    finally { setComprobando(false); }
  }), [navigate]);

  async function cargarRegistros() {
    setCargando(true); setMensaje("");
    try {
      const resultado = await getDocs(collection(db, seccion));
      if (seccion === "planes") {
        const guardados = new Map(resultado.docs.map((item) => [item.id, item.data()]));
        // Los planes son fijos: siempre se muestran Bronze, Silver y Golden.
        setRegistros(planesIniciales.map((plan) => ({
          ...plan,
          ...(guardados.get(plan.id) || {}),
          id: plan.id,
        })));
      } else {
        setRegistros(resultado.docs.map((item) => ({ id: item.id, ...item.data() })));
      }
    } catch (error) {
      if (seccion === "planes") setRegistros(planesIniciales);
      setMensaje(seccion === "planes"
        ? "No se pudieron leer los planes de Firestore. Revisá las reglas de lectura de la colección planes."
        : "No se pudieron cargar los datos. Revisá las reglas de Firestore y que tu usuario tenga rol admin.");
    }
    finally { setCargando(false); }
  }

  useEffect(() => { if (admin) { setFormulario({}); setEditando(null); cargarRegistros(); } }, [admin, seccion]);

  function cambiarCampo(key, value, type) {
    setFormulario((actual) => ({ ...actual, [key]: type === "number" && value !== "" ? Number(value) : value }));
  }

  async function guardar(e) {
    e.preventDefault(); setMensaje(""); setCargando(true);
    try {
      const datos = { ...formulario };
      if (seccion === "planes") {
        datos.beneficios = String(datos.beneficiosTexto || "").split("\n").map((linea) => linea.trim()).filter(Boolean).map((linea) => {
          const [icono = "🎟️", ...partes] = linea.split("|");
          return { icono: icono.trim(), antes: "", destacado: partes.join("|").trim(), despues: "" };
        });
        delete datos.beneficiosTexto;
        datos.modal = { icono: datos.modalIcono || "🎟️", titulo: datos.modalTitulo || "", texto: datos.modalTexto || "", precio: datos.modalPrecio || "" };
        delete datos.modalIcono; delete datos.modalTitulo; delete datos.modalTexto; delete datos.modalPrecio;
        datos.precio = datos.precio || null;
        datos.requisito = datos.requisito || null;
        datos.desbloqueo = datos.desbloqueo || null;
      }
      if (seccion === "candy") {
        datos.detalles = Array.isArray(datos.detalles)
          ? datos.detalles
          : String(datos.detalles || "").split(",").map((v) => v.trim()).filter(Boolean);
        datos.activo = datos.activo === undefined ? true : (datos.activo === true || datos.activo === "true");
        datos.stock = Math.max(0, Number(datos.stock || 0));
        datos.precio = Math.max(0, Number(datos.precio || 0));
      }
      if (seccion !== "planes") {
        for (const campo of SECCIONES[seccion].campos) {
          if (!(campo.key in datos)) datos[campo.key] = campo.type === "number" ? 0 : "";
        }
      }
      if (seccion === "planes") {
        const id = editando || formulario.id;
        if (!id) throw new Error("Falta el identificador del plan.");
        await setDoc(doc(db, "planes", id), datos, { merge: true });
      } else if (editando) await updateDoc(doc(db, seccion, editando), datos);
      else await addDoc(collection(db, seccion), datos);
      setFormulario({}); setEditando(null); setMensaje("Cambios guardados correctamente."); await cargarRegistros();
    } catch { setMensaje("No se pudo guardar. Verificá que tu cuenta tenga permisos de administrador."); }
    finally { setCargando(false); }
  }

  function editar(item) {
    const datos = { ...item }; 
    if (seccion === "planes") {
      datos.id = item.id;
      datos.beneficiosTexto = (item.beneficios || []).map((b) => `${b.icono || "🎟️"}|${[b.antes, b.destacado, b.despues].filter(Boolean).join("")}`).join("\n");
      datos.modalIcono = item.modal?.icono || "🎟️";
      datos.modalTitulo = item.modal?.titulo || "";
      datos.modalTexto = item.modal?.texto || "";
      datos.modalPrecio = item.modal?.precio || "";
    }
    delete datos.id;
    if (seccion === "candy") {
      datos.detalles = Array.isArray(datos.detalles) ? datos.detalles.join(", ") : "";
      datos.activo = String(datos.activo !== false);
    }
    setFormulario(datos); setEditando(item.id); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminar(id) {
    if (seccion === "planes") { setMensaje("Los tres planes de GoldenTicket se mantienen y no se pueden eliminar."); return; }
    if (!window.confirm("¿Seguro que querés eliminar este registro?")) return;
    setMensaje("");
    try { await deleteDoc(doc(db, seccion, id)); setMensaje("Registro eliminado."); await cargarRegistros(); }
    catch { setMensaje("No se pudo eliminar. Verificá los permisos de administrador."); }
  }

  if (comprobando) return <main className="admin-page"><p>Verificando permisos...</p></main>;
  if (!admin) return null;

  return <main className="admin-page">
    <div className="admin-heading"><div><p className="admin-kicker">GOLDEN TICKET</p><h1>Panel de administración</h1><p>Gestioná el contenido y el stock de tu cine.</p></div><Link className="admin-volver" to="/">Volver al sitio</Link></div>
    <div className="admin-tabs">{Object.entries(SECCIONES).map(([key, valor]) => <button key={key} className={seccion === key ? "activo" : ""} onClick={() => setSeccion(key)}>{valor.titulo}</button>)}</div>

    {(seccion !== "planes" || editando) && <section className="admin-panel"><h2>{editando ? "Editar plan" : `Agregar ${SECCIONES[seccion].titulo.toLowerCase()}`}</h2>
      <form className="admin-form" onSubmit={guardar}>{SECCIONES[seccion].campos.map((campo) => <label key={campo.key}>{campo.label}{campo.type === "textarea" ? <textarea rows="4" value={formulario[campo.key] ?? ""} onChange={(e) => cambiarCampo(campo.key, e.target.value, campo.type)} /> : <input type={campo.type || "text"} value={formulario[campo.key] ?? ""} onChange={(e) => cambiarCampo(campo.key, e.target.value, campo.type)} required={campo.key === "nombre" || campo.key === "titulo" || campo.key === "pelicula"} />}</label>)}
        <div className="admin-actions"><button disabled={cargando} type="submit">{editando ? "Guardar cambios" : "Agregar"}</button>{editando && <button type="button" className="secundario" onClick={() => { setEditando(null); setFormulario({}); }}>Cancelar</button>}</div>
      </form>
    </section>}
    {mensaje && <p className="admin-mensaje" role="status">{mensaje}</p>}
    <section className="admin-panel"><h2>{seccion === "planes" ? "Planes existentes" : `Registros de ${SECCIONES[seccion].titulo.toLowerCase()}`}</h2>{cargando && <p>Cargando...</p>}{!cargando && registros.length === 0 && <p>Todavía no hay registros en esta colección.</p>}
      {registros.length > 0 && <div className="admin-table-wrap"><table><thead><tr>{SECCIONES[seccion].campos.map((c) => <th key={c.key}>{c.label}</th>)}<th>Acciones</th></tr></thead><tbody>{registros.map((item) => <tr key={item.id}>{SECCIONES[seccion].campos.map((c) => <td key={c.key}>{seccion === "planes" && c.key === "beneficiosTexto" ? (item.beneficios || []).map((b) => `${b.icono || ""} ${b.antes || ""}${b.destacado || ""}${b.despues || ""}`).join(" / ") : String(item[c.key] ?? "—")}</td>)}<td className="admin-row-actions"><button onClick={() => editar(item)}>Editar</button>{seccion !== "planes" && <button className="eliminar" onClick={() => eliminar(item.id)}>Eliminar</button>}</td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
export default Admin;
