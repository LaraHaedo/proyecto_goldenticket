const CLAVE_SESION = 'usuarioLogueado';
const CLAVE_RETORNO = 'paginaRetorno';

export function estaLogueado() {
  return localStorage.getItem(CLAVE_SESION) === 'true';
}

export function guardarPaginaRetorno(pagina = '/pelicula') {
  localStorage.setItem(CLAVE_RETORNO, pagina);
}

export function obtenerPaginaRetorno() {
  return localStorage.getItem(CLAVE_RETORNO) || '/pelicula';
}

export function loginExitoso(navegar) {
  localStorage.setItem(CLAVE_SESION, 'true');
  const destino = obtenerPaginaRetorno();
  localStorage.removeItem(CLAVE_RETORNO);
  navegar(destino);
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE_SESION);
  localStorage.removeItem('usuarioActual');
  localStorage.removeItem('usuarioEmail');
}

export function obtenerUsuario() {
  const email = localStorage.getItem('usuarioEmail');
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  return usuarios.find((u) => u.email === email) || null;
}

export function guardarUsuario(usuario) {
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  const posicion = usuarios.findIndex((u) => u.email === usuario.email);
  if (posicion >= 0) {
    usuarios[posicion] = usuario;
    localStorage.setItem('usuarios', JSON.stringify(usuarios));
  }
}
