export const PRECIOS = { '2D': 9000, '3D': 11000 };
export const MAX_ENTRADAS = 10;
export const COMPRAS_PARA_PLATA = 5;
export const COMPRAS_PARA_DORADO = 10;
export const GRATIS_DORADO_POR_MES = 2;

export const NIVELES = {
  bronce: { nombre: 'Bronce', beneficio: '2x1 en entradas de lunes a miércoles' },
  plata: { nombre: 'Plata', beneficio: '4x2 en entradas de lunes a jueves (y 2x1 de lunes a miércoles)' },
  dorado: { nombre: 'Dorado', beneficio: '20% en entradas todos los días y 2 entradas gratis por mes' }
};

export function obtenerNivel(compras) {
  if (compras >= COMPRAS_PARA_DORADO) return 'dorado';
  if (compras >= COMPRAS_PARA_PLATA) return 'plata';
  return 'bronce';
}

export function normalizarDia(dia) {
  return String(dia).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function claveMes() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

export function entradasGratisDisponibles(nivel, gratisUsadas) {
  if (nivel !== 'dorado') return 0;
  const usadas = gratisUsadas?.mes === claveMes() ? gratisUsadas.cantidad : 0;
  return Math.max(0, GRATIS_DORADO_POR_MES - usadas);
}

export function calcularPrecio(precioUnitario, cantidad, dia, nivel, gratisDisponibles) {
  const subtotal = precioUnitario * cantidad;
  const diaNormal = normalizarDia(dia);
  const lunesAMiercoles = ['lunes', 'martes', 'miercoles'].includes(diaNormal);
  const lunesAJueves = lunesAMiercoles || diaNormal === 'jueves';
  const candidatas = [];

  if (lunesAMiercoles) candidatas.push({ nombre: '2x1 (lunes a miércoles)', total: Math.ceil(cantidad / 2) * precioUnitario });
  if ((nivel === 'plata' || nivel === 'dorado') && lunesAJueves) {
    candidatas.push({ nombre: '4x2 (lunes a jueves)', total: (Math.floor(cantidad / 4) * 2 + (cantidad % 4)) * precioUnitario });
  }
  if (nivel === 'dorado') candidatas.push({ nombre: '20% de descuento Dorado', total: Math.round(subtotal * 0.8) });

  let mejor = null;
  candidatas.forEach((c) => {
    if (c.total < subtotal && (!mejor || c.total < mejor.total)) mejor = c;
  });

  let total = mejor ? mejor.total : subtotal;
  const promo = mejor ? { nombre: mejor.nombre, ahorro: subtotal - mejor.total } : null;
  let gratis = null;
  const cantidadGratis = Math.min(gratisDisponibles || 0, cantidad);

  if (nivel === 'dorado' && cantidadGratis > 0) {
    const ahorro = Math.round(total / cantidad * cantidadGratis);
    gratis = { cantidad: cantidadGratis, ahorro };
    total -= ahorro;
  }
  return { subtotal, promo, gratis, total };
}
