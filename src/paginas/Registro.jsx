import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LoadingModal from "../components/LoadingModal";
import { loginExitoso } from "../utils/auth";

function Registro() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  function registrarse(e) {
    e.preventDefault();
    if (password !== confirmar)
      return setError("Las contraseñas no coinciden.");
    const usuarios = JSON.parse(localStorage.getItem("usuarios") || "[]");
    const emailNormalizado = email.trim().toLowerCase();
    if (usuarios.some((u) => u.email === emailNormalizado))
      return setError("Ya hay una cuenta con ese email. Iniciá sesión.");
    usuarios.push({
      nombre: nombre.trim(),
      email: emailNormalizado,
      password,
      compras: 0,
      gratis: null,
    });
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    localStorage.setItem("usuarioActual", nombre.trim());
    localStorage.setItem("usuarioEmail", emailNormalizado);
    setError("");
    setCargando(true);
    setTimeout(() => loginExitoso(navigate), 1800);
  }

  return (
    <>
      <main className="cuenta-container">
        <div className="cuenta-card">
          <h1>Crear cuenta</h1>
          <p className="cuenta-sub">
            Registrate para comprar entradas en Golden Ticket
          </p>
          <form onSubmit={registrarse}>
            <label htmlFor="nombreRegistro">Nombre y apellido</label>
            <input
              id="nombreRegistro"
              type="text"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
            <label htmlFor="emailRegistro">Email</label>
            <input
              id="emailRegistro"
              type="email"
              placeholder="tuemail@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label htmlFor="passwordRegistro">Contraseña</label>
            <input
              id="passwordRegistro"
              type="password"
              placeholder="Mínimo 6 caracteres"
              minLength="6"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label htmlFor="passwordConfirmar">Repetir contraseña</label>
            <input
              id="passwordConfirmar"
              type="password"
              placeholder="Repetí tu contraseña"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
            />
            <p className="error-cuenta">{error}</p>
            <button type="submit" className="btn-cuenta">
              Registrarme
            </button>
          </form>
          <p className="cuenta-link">
            ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
          </p>
        </div>
      </main>
      <LoadingModal visible={cargando} titulo="Creando tu cuenta" />
    </>
  );
}
export default Registro;
