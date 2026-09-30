import { Link, NavLink } from "react-router-dom";

function Navbar() {
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
        </ul>
      </nav>
    </header>
  );
}

export default Navbar;
