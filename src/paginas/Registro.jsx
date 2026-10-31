import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import "../estilos/cuenta.css";
import { Link, useNavigate } from "react-router-dom";
import LoadingModal from "../componentes/LoadingModal";
import { auth, db } from "../firebase/config";

function mensajeErrorFirebase(error) {
  switch (error?.code) {
    case "auth/email-already-in-use": return "Ya existe una cuenta con ese email. Iniciá sesión.";
    case "auth/invalid-email": return "El formato del email no es válido.";
    case "auth/weak-password": return "La contraseña es muy débil. Usá al menos 6 caracteres.";
    case "auth/network-request-failed": return "No hay conexión. Revisá tu internet e intentá otra vez.";
    default: return "No se pudo crear la cuenta. Intentá nuevamente.";
  }
}

function Registro() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  async function registrarse(e) {
    e.preventDefault();
    setError("");
    if (password !== confirmar) return setError("Las contraseñas no coinciden.");
    if (password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");

    setCargando(true);
    let credencial;
    try {
      const emailNormalizado = email.trim().toLowerCase();
      credencial = await createUserWithEmailAndPassword(auth, emailNormalizado, password);
      await updateProfile(credencial.user, { displayName: nombre.trim() });

      // El rol se establece siempre como usuario desde el cliente.
      // El administrador se asignará aparte desde la consola con reglas que impidan autoelevarse.
      await setDoc(doc(db, "usuarios", credencial.user.uid), {
        uid: credencial.user.uid,
        nombre: nombre.trim(),
        email: emailNormalizado,
        rol: "usuario",
        compras: 0,
        gratis: null,
        creadoEn: serverTimestamp(),
      });

      localStorage.setItem("usuarioLogueado", "true");
      localStorage.setItem("usuarioActual", nombre.trim());
      localStorage.setItem("usuarioEmail", emailNormalizado);
      localStorage.setItem("usuarioRol", "usuario");
      navigate("/");
    } catch (err) {
      // Si Auth creó la cuenta pero falló el perfil de Firestore, avisamos sin ocultar el problema.
      if (credencial?.user) {
        setError("La cuenta se creó, pero no pudimos guardar tu perfil en la base de datos. Revisá las reglas de Firestore y volvé a iniciar sesión.");
      } else {
        setError(mensajeErrorFirebase(err));
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <main className="cuenta-container">
        <div className="cuenta-card">
          <h1>Crear cuenta</h1>
          <p className="cuenta-sub">Registrate para comprar entradas en Golden Ticket</p>
          <form onSubmit={registrarse}>
            <label htmlFor="nombreRegistro">Nombre y apellido</label>
            <input id="nombreRegistro" type="text" autoComplete="name" placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            <label htmlFor="emailRegistro">Email</label>
            <input id="emailRegistro" type="email" autoComplete="email" placeholder="tuemail@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label htmlFor="passwordRegistro">Contraseña</label>
            <input id="passwordRegistro" type="password" autoComplete="new-password" placeholder="Mínimo 6 caracteres" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <label htmlFor="passwordConfirmar">Repetir contraseña</label>
            <input id="passwordConfirmar" type="password" autoComplete="new-password" placeholder="Repetí tu contraseña" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />
            <p className="error-cuenta" role="alert">{error}</p>
            <button type="submit" className="btn-cuenta" disabled={cargando}>{cargando ? "Creando cuenta..." : "Registrarme"}</button>
          </form>
          <p className="cuenta-link">¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link></p>
        </div>
      </main>
      <LoadingModal visible={cargando} titulo="Creando tu cuenta" />
    </>
  );
}

export default Registro;
