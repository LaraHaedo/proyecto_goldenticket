
export const planes = [
  {
    id: "bronze",
    nombre: "Bronze",
    numero: "PLAN 01",
    requisito: "Gratis al registrarte",
    precio: null,
    desbloqueo: null,
    beneficios: [
      { icono: "🎟️", antes: "", destacado: "2x1 en Entradas", despues: " (Lunes a Miércoles)" },
      { icono: "🍿", antes: "", destacado: "10% OFF", despues: " en el Candy Bar" },
    ],
    modal: {
      icono: "🥉",
      titulo: "¡PLAN BRONZE SELECCIONADO!",
      texto:
        "Registrate completamente gratis para disfrutar de tu 2x1 semanal y 10% OFF en Candy Bar.",
      precio: "¡GRATIS!",
    },
  },
  {
    id: "silver",
    nombre: "Silver",
    numero: "PLAN 02",
    requisito: null,
    precio: "$7.999 / mes",
    desbloqueo: "⚡ Desbloquéalo acumulando 5 compras",
    beneficios: [
      { icono: "🎟️", antes: "", destacado: "4x2 en Entradas", despues: " (Lunes a Jueves)" },
      { icono: "🍿", antes: "Beneficios del Plan Bronce incluidos", destacado: "", despues: "" },
    ],
    modal: {
      icono: "🥈",
      titulo: "¡PLAN SILVER SELECCIONADO!",
      texto:
        "Suscripción mensual de nivel intermedio para disfrutar de tu beneficio 4x2 en cine.",
      precio: "$7.999 / mes",
    },
  },
  {
    id: "golden",
    nombre: "Golden",
    numero: "PLAN 03",
    requisito: null,
    precio: "$11.999 / mes",
    desbloqueo: "⚡ Desbloquéalo acumulando 10+ compras",
    beneficios: [
      { icono: "🎟️", antes: "", destacado: "2 Entradas GRATIS", despues: " al mes" },
      { icono: "🔥", antes: "", destacado: "20% OFF en Entradas", despues: " todos los días" },
      { icono: "⭐", antes: "Acceso prioritario a ", destacado: "Preventas Exclusivas", despues: "" },
    ],
    modal: {
      icono: "👑",
      titulo: "¡PLAN GOLDEN VIP SELECCIONADO!",
      texto:
        "Experiencia VIP total con 2 entradas gratis al mes, 20% OFF siempre y preventas.",
      precio: "$11.999 / mes",
    },
  },
];
