// Formatea un número con puntos de miles: 12500 -> "12.500"
export function formatearPrecio(numero) {
  return String(numero).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
