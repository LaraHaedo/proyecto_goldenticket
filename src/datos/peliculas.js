// Los pósters van en public/peliculas/ (se usan con la ruta "/peliculas/archivo.jpg")
export const peliculas = [
  {
    id: 1,
    titulo: "AVATAR: FUEGO Y CENIZAS",
    genero: "Ciencia Ficción",
    duracion: "3h 15m",
    horarios: ["20:30"],
    imagen: "/peliculas/Avatar.jpg",
  },
  {
    id: 2,
    titulo: "TERRIFIER 3",
    genero: "Horror / Suspenso",
    duracion: "2h 5m",
    horarios: ["15:15"],
    imagen: "/peliculas/Terrifier.jpg",
  },
  {
    id: 3,
    titulo: "LA ODISEA",
    genero: "Animación / Fantasia",
    duracion: "2h 52m",
    horarios: ["12:00"],
    imagen: "/peliculas/LaOdisea.jpg",
  },
  {
    id: 4,
    titulo: "SPIDERMAN: Un nuevo Día",
    genero: "Acción / fantasia",
    duracion: "2h 30m",
    horarios: ["17:40"],
    imagen: "/peliculas/Spiderman.jpg",
  },
];

export const destacados = [
  {
    sub: "Gran Estreno de la Semana",
    title: "AVATAR: FUEGO Y CENIZAS",
    info: "SALA 2D- HOY 20:30 HS",
  },
  {
    sub: "Exclusivo de Medianoche",
    title: "TERRIFIER 3",
    info: "SALA 2D - VIERNES Y SABADO",
  },
  {
    sub: "Función Especial",
    title: "La Odisea",
    info: "SALA 3D - TODOS LOS DÍAS 12:00 HS",
  },
];

export const promociones = [
  { id: 1, titulo: "Combo Pochoclos + Bebida", texto: "Aprovecha un 20% de descuento en la compra de tu combo clásico en dulcería." },
  { id: 2, titulo: "Miércoles Golden 2x1", texto: "Todas las funciones de los días miércoles al 50% comprando tus boletos online." },
  { id: 3, titulo: "Descuento Grupal", texto: "Vengan en grupos de 5 personas o más y obtengan descuento especial en taquilla." },
  { id: 4, titulo: "Sorteos Golden Ticket", texto: "Participa mensualmente por pases libres escribiéndonos a nuestras redes sociales." },
  { id: 5, titulo: "Funciones de Medianoche", texto: "Precios especiales en funciones temáticas después de las 23:00 hs." },
  { id: 6, titulo: "Estudiantes & Seniors", texto: "Presenta tu acreditación en boletería y accede a tarifas diferenciadas todos los días." },
];
