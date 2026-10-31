import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const CLAVE_RETORNO = "paginaRetorno";

export function estaLogueado() {
  return Boolean(auth.currentUser);
}

export function guardarPaginaRetorno(pagina = "/pelicula") {
  localStorage.setItem(CLAVE_RETORNO, pagina);
}

export function obtenerPaginaRetorno() {
  return localStorage.getItem(CLAVE_RETORNO) || "/pelicula";
}

export function loginExitoso(navegar) {
  const destino = obtenerPaginaRetorno();
  localStorage.removeItem(CLAVE_RETORNO);
  navegar(destino);
}

export async function cerrarSesion() {
  await signOut(auth);
  ["usuarioLogueado", "usuarioActual", "usuarioEmail", "usuarioRol"].forEach((clave) => localStorage.removeItem(clave));
}

// Compatibilidad temporal con pantallas que todavía usan el perfil en memoria local.
// La fuente de verdad del usuario es Firebase Authentication y Firestore.
export function obtenerUsuario() {
  const email = localStorage.getItem("usuarioEmail");
  if (!email) return null;
  return {
    nombre: localStorage.getItem("usuarioActual") || "",
    email,
    rol: localStorage.getItem("usuarioRol") || "usuario",
  };
}

export async function obtenerPerfilFirebase(uid) {
  const perfil = await getDoc(doc(db, "usuarios", uid));
  return perfil.exists() ? perfil.data() : null;
}

export async function guardarUsuario(usuario) {
  const actual = auth.currentUser;
  if (!actual || actual.uid !== usuario.uid) throw new Error("No autorizado");
  await updateDoc(doc(db, "usuarios", actual.uid), { nombre: usuario.nombre });
  localStorage.setItem("usuarioActual", usuario.nombre);
}
