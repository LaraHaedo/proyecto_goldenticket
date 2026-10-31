import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { cerrarSesion, guardarPaginaRetorno } from "../utils/auth";

function Navbar() {
  const navigate = useNavigate();
  const [logueado, setLogueado] = useState(Boolean(auth.currentUser));
  const [esAdmin, setEsAdmin] = useState(localStorage.getItem("usuarioRol") === "admin");

  useEffect(() => onAuthStateChanged(auth, (usuario) => {
    setLogueado(Boolean(usuario));
    if (!usuario) {
      setEsAdmin(false);
      return;
    }
    // El rol se consulta en Firestore, no se toma del formulario de registro.
    getDoc(doc(db, "usuarios", usuario.uid))
      .then((perfil) => {
        const admin = perfil.exists() && perfil.data().rol === "admin";
        setEsAdmin(admin);
        localStorage.setItem("usuarioRol", admin ? "admin" : "usuario");
      })
      .catch(() => setEsAdmin(false));
  }), []);

  async function cuenta(e) {
    e.preventDefault();
    if (logueado) {
      try {
        await cerrarSesion();
        setLogueado(false);
        setEsAdmin(false);
        navigate("/");
      } catch {
        navigate("/");
      }
    } else {
      guardarPaginaRetorno("/compra");
      navigate("/login");
    }
  }

  return (
    <header>
      <Link to="/" className="logo">Golden <span>Ticket</span></Link>
      <nav>
        <ul>
          <li><NavLink to="/" end>Inicio</NavLink></li>
          <li><NavLink to="/planes">Beneficios</NavLink></li>
          <li><NavLink to="/candy">Candy</NavLink></li>
          {!logueado && <li><Link to="/registro">Registrarse</Link></li>}
          {esAdmin && <li><Link to="/admin">Administración</Link></li>}
          <li><a href={logueado ? "/" : "/login"} onClick={cuenta}>{logueado ? "Cerrar sesión" : "Iniciar sesión"}</a></li>
        </ul>
      </nav>
    </header>
  );
}

export default Navbar;
