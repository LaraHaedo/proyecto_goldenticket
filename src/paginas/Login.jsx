import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import "../estilos/cuenta.css";
import { Link, useNavigate } from "react-router-dom";
import LoadingModal from "../componentes/LoadingModal";
import { auth, db } from "../firebase/config";
import { obtenerPaginaRetorno } from "../utils/auth";

function mensajeErrorFirebase(error) {
  switch (error?.code) {
    case "auth/invalid-email": return "El formato del email no es válido.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found": return "El email o la contraseña son incorrectos.";
    case "auth/too-many-requests": return "Hubo demasiados intentos. Esperá un momento y probá de nuevo.";
    case "auth/network-request-failed": return "No hay conexión. Revisá tu internet e intentá otra vez.";
    default: return "No se pudo iniciar sesión. Revisá los datos e intentá nuevamente.";
  }
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  async function iniciarSesion(e) {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const credencial = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password,
      );
      const usuarioFirebase = credencial.user;
      const perfilRef = doc(db, "usuarios", usuarioFirebase.uid);
      const perfilSnap = await getDoc(perfilRef);
      const perfil = perfilSnap.exists() ? perfilSnap.data() : {};

      // Datos de compatibilidad para pantallas existentes; la contraseña nunca se guarda aquí.
      localStorage.setItem("usuarioLogueado", "true");
      localStorage.setItem("usuarioActual", perfil.nombre || usuarioFirebase.displayName || "Usuario");
      localStorage.setItem("usuarioEmail", usuarioFirebase.email || "");
      localStorage.setItem("usuarioRol", perfil.rol === "admin" ? "admin" : "usuario");

      const destino = obtenerPaginaRetorno();
      localStorage.removeItem("paginaRetorno");
      navigate(perfil.rol === "admin" ? "/admin" : destino);
    } catch (err) {
      setError(mensajeErrorFirebase(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <main className="cuenta-container">
        <div className="cuenta-card">
          <h1>Iniciar sesión</h1>
          <p className="cuenta-sub">Ingresá a tu cuenta para comprar tus entradas</p>
          <form onSubmit={iniciarSesion}>
            <label htmlFor="emailLogin">Email</label>
            <input id="emailLogin" type="email" autoComplete="email" placeholder="tuemail@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label htmlFor="passwordLogin">Contraseña</label>
            <input id="passwordLogin" type="password" autoComplete="current-password" placeholder="Tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <p className="error-cuenta" role="alert">{error}</p>
            <button type="submit" className="btn-cuenta" disabled={cargando}>{cargando ? "Ingresando..." : "Ingresar"}</button>
          </form>
          <p className="cuenta-link">¿No tenés cuenta? <Link to="/registro">Registrate</Link></p>
        </div>
      </main>
      <LoadingModal visible={cargando} titulo="Iniciando sesión" />
    </>
  );
}

export default Login;
