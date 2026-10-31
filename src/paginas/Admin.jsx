import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/config";
import "../estilos/admin.css";

const SECCIONES = {
  peliculas: { titulo: "Películas", campos: [{ key: "titulo", label: "Título" }, { key: "descripcion", label: "Descripción" }, { key: "genero", label: "Género" }, { key: "duracion", label: "Duración (minutos)", type: "number" }, { key: "imagen", label: "URL de imagen" }] },
  horarios: { titulo: "Horarios", campos: [{ key: "pelicula", label: "Película" }, { key: "fecha", label: "Fecha", type: "date" }, { key: "hora", label: "Hora", type: "time" }, { key: "sala", label: "Sala" }, { key: "precio", label: "Precio", type: "number" }, { key: "disponibles", label: "Entradas disponibles", type: "number" }] },
  candy: { titulo: "Candy y stock", campos: [{ key: "nombre", label: "Producto" }, { key: "categoria", label: "Categoría" }, { key: "descripcion", label: "Descripción" }, { key: "precio", label: "Precio", type: "number" }, { key: "stock", label: "Stock disponible", type: "number" }, { key: "imagen", label: "URL de imagen" }] },
  beneficios: { titulo: "Beneficios", campos: [{ key: "nombre", label: "Nombre" }, { key: "descripcion", label: "Descripción" }, { key: "precio", label: "Precio", type: "number" }, { key: "estado", label: "Estado (activo/inactivo)" }] },
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
      setRegistros(resultado.docs.map((item) => ({ id: item.id, ...item.data() })));
    } catch { setMensaje("No se pudieron cargar los datos. Revisá las reglas de Firestore y que tu usuario tenga rol admin."); }
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
      for (const campo of SECCIONES[seccion].campos) if (!(campo.key in datos)) datos[campo.key] = campo.type === "number" ? 0 : "";
      if (editando) await updateDoc(doc(db, seccion, editando), datos);
      else await addDoc(collection(db, seccion), datos);
      setFormulario({}); setEditando(null); setMensaje("Cambios guardados correctamente."); await cargarRegistros();
    } catch { setMensaje("No se pudo guardar. Verificá que tu cuenta tenga permisos de administrador."); }
    finally { setCargando(false); }
  }

  function editar(item) {
    const datos = { ...item }; delete datos.id;
    setFormulario(datos); setEditando(item.id); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminar(id) {
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
    <section className="admin-panel"><h2>{editando ? "Editar" : "Agregar"} {SECCIONES[seccion].titulo.toLowerCase()}</h2>
      <form className="admin-form" onSubmit={guardar}>{SECCIONES[seccion].campos.map((campo) => <label key={campo.key}>{campo.label}<input type={campo.type || "text"} value={formulario[campo.key] ?? ""} onChange={(e) => cambiarCampo(campo.key, e.target.value, campo.type)} required={campo.key === "nombre" || campo.key === "titulo" || campo.key === "pelicula"} /></label>)}
        <div className="admin-actions"><button disabled={cargando} type="submit">{editando ? "Guardar cambios" : "Agregar"}</button>{editando && <button type="button" className="secundario" onClick={() => { setEditando(null); setFormulario({}); }}>Cancelar</button>}</div>
      </form>
    </section>
    {mensaje && <p className="admin-mensaje" role="status">{mensaje}</p>}
    <section className="admin-panel"><h2>Registros de {SECCIONES[seccion].titulo.toLowerCase()}</h2>{cargando && <p>Cargando...</p>}{!cargando && registros.length === 0 && <p>Todavía no hay registros en esta colección.</p>}
      {registros.length > 0 && <div className="admin-table-wrap"><table><thead><tr>{SECCIONES[seccion].campos.map((c) => <th key={c.key}>{c.label}</th>)}<th>Acciones</th></tr></thead><tbody>{registros.map((item) => <tr key={item.id}>{SECCIONES[seccion].campos.map((c) => <td key={c.key}>{String(item[c.key] ?? "—")}</td>)}<td className="admin-row-actions"><button onClick={() => editar(item)}>Editar</button><button className="eliminar" onClick={() => eliminar(item.id)}>Eliminar</button></td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
export default Admin;
