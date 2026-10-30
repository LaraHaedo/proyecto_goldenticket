import { Link, NavLink, useNavigate } from "react-router-dom";
import { cerrarSesion, estaLogueado, guardarPaginaRetorno } from "../utils/auth";

function Navbar() {
  const navigate = useNavigate();
  const logueado = estaLogueado();

  function cuenta(e) {
    e.preventDefault();

    if (logueado) {
      cerrarSesion();
      navigate("/");
    } else {
      guardarPaginaRetorno("/compra");
      navigate("/login");
    }
  }
  return (
    <header>
      <Link to="/" className="logo">
        Golden <span>Ticket</span>
      </Link>

      <nav>
        <ul>
          <li>
            {/* NavLink agrega la clase "active" automáticamente a la ruta actual */}
            <NavLink to="/" end>Inicio</NavLink>
          </li>
          <li>
            <NavLink to="/planes">Beneficios</NavLink>
          </li>
          <li>
            <NavLink to="/candy">Candy</NavLink>
          </li>
          <li>
            <Link to="/registro">Registrarse</Link>
          </li>
          <li>
            <a href={logueado ? "/" : "/login"} onClick={cuenta}>
              {logueado ? "Cerrar sesión" : "Iniciar sesión"}
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}

export default Navbar;
