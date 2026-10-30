import { useState } from "react";
import "../estilos/cuenta.css";
import { Link, useNavigate } from "react-router-dom";
import LoadingModal from "../componentes/LoadingModal";
import { loginExitoso, obtenerPaginaRetorno } from "../utils/auth";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  function iniciarSesion(e) {
    e.preventDefault();
    const usuarios = JSON.parse(localStorage.getItem("usuarios") || "[]");
    const usuario = usuarios.find(
      (u) => u.email === email.trim().toLowerCase(),
    );
    if (!usuario)
      return setError("No existe una cuenta con ese email. ¡Registrate!");
    if (usuario.password !== password)
      return setError("La contraseña es incorrecta.");
    setError("");
    localStorage.setItem("usuarioActual", usuario.nombre);
    localStorage.setItem("usuarioEmail", usuario.email);
    setCargando(true);
    setTimeout(() => loginExitoso(navigate), 1800);
  }

  return (
    <>
      <main className="cuenta-container">
        <div className="cuenta-card">
          <h1>Iniciar sesión</h1>
          <p className="cuenta-sub">
            Ingresá a tu cuenta para comprar tus entradas
          </p>
          <form onSubmit={iniciarSesion}>
            <label htmlFor="emailLogin">Email</label>
            <input
              id="emailLogin"
              type="email"
              placeholder="tuemail@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label htmlFor="passwordLogin">Contraseña</label>
            <input
              id="passwordLogin"
              type="password"
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="error-cuenta">{error}</p>
            <button type="submit" className="btn-cuenta">
              Ingresar
            </button>
          </form>
          <p className="cuenta-link">
            ¿No tenés cuenta? <Link to="/registro">Registrate</Link>
          </p>
        </div>
      </main>
      <LoadingModal visible={cargando} titulo="Iniciando sesión" />
    </>
  );
}
export default Login;