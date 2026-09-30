export const categorias = [
  { id: "todos", etiqueta: "Todos" },
  { id: "combos", etiqueta: "🍿 Combos", titulo: "🍿 COMBOS ESPECIALES" },
  { id: "pochoclos", etiqueta: "🍿 Pochoclos", titulo: "🍿 POCHOCLOS INDIVIDUALES" },
  { id: "bebidas", etiqueta: "🥤 Bebidas", titulo: "🥤 BEBIDAS INDIVIDUALES" },
  { id: "golosinas", etiqueta: "🍫 Golosinas", titulo: "🍫 GOLOSINAS & CHOCOLATES" },
  { id: "snacks", etiqueta: "🥨 Snacks", titulo: "🥨 SNACKS SALADOS" },
];

export const productos = [
  // combos
  {
    id: 1, categoria: "combos", estilo: "bronze", codigo: "COMBO 01",
    nombre: "Combo Individual", nombreCarrito: "Combo Individual",
    descripcion: "Ideal para disfrutar solo. Incluye pochoclos crujientes y tu bebida fría a elección.",
    detalles: ["1 Pochoclo Mediano", "1 Gaseosa 500ml", "Lentes 3D"],
    precio: 12500, imagen: "/imagenes/comboindividual.png", badge: "Económico",
  },
  {
    id: 2, categoria: "combos", estilo: "silver", codigo: "COMBO 02",
    nombre: "Combo Dúo Cine", nombreCarrito: "Combo Dúo Cine",
    descripcion: "Pensado para compartir en pareja o con amigos en la sala.",
    detalles: ["1 Balde Gigante", "2 Gaseosas 750ml", "2 Lentes 3D"],
    precio: 17500, imagen: "/imagenes/comboduo.jpg", badge: "Popular",
  },
  {
    id: 3, categoria: "combos", estilo: "golden", codigo: "COMBO 03",
    nombre: "Combo Mega Golden", nombreCarrito: "Combo Mega Golden",
    descripcion: "La máxima experiencia de Candy con balde coleccionable y golosina extra.",
    detalles: ["1 Balde Recargable", "2 Bebidas Grandes", "1 Golosina a elección", "Retiro VIP"],
    precio: 24500, imagen: "/imagenes/combo-golden.jpg", badge: "VIP",
  },

  // pochoclos
  {
    id: 4, categoria: "pochoclos", estilo: "golden", codigo: "POCHOCLO 01",
    nombre: "Balde Pochoclo Dulce XL", nombreCarrito: "Balde Pochoclo Dulce XL",
    descripcion: "Pochoclos recién hechos, acaramelados, crocantes y en su punto justo de dulzor.",
    detalles: ["Balde Gigante (3L)", "Caramelo Especial", "Recién elaborados"],
    precio: 8900, imagen: "/imagenes/pochoclos.jpg", badge: "Favorito",
  },
  {
    id: 5, categoria: "pochoclos", estilo: "silver", codigo: "POCHOCLO 02",
    nombre: "Balde Pochoclo Salado XL", nombreCarrito: "Balde Pochoclo Salado XL",
    descripcion: "El clásico sabor mantecoso e intenso, perfecto para acompañar una buena bebida fría.",
    detalles: ["Balde Gigante (3L)", "Manteca y Sal", "Calientitos"],
    precio: 8500, imagen: "/imagenes/pochoclos.jpg",
  },
  {
    id: 6, categoria: "pochoclos", estilo: "bronze", codigo: "POCHOCLO 03",
    nombre: "Balde Pochoclo Mixto", nombreCarrito: "Balde Pochoclo Mixto",
    descripcion: "Combinación ideal de mitad salado y mitad dulce para los indecisos.",
    detalles: ["Balde Mediano (2L)", "50% Dulce / 50% Salado"],
    precio: 7800, imagen: "/imagenes/pochoclos.jpg",
  },

  // bebidas
  {
    id: 7, categoria: "bebidas", estilo: "silver", codigo: "BEBIDA 01",
    nombre: "Coca-Cola", nombreCarrito: "Coca-Cola 750ml",
    descripcion: "Gaseosa helada recién servida en vaso térmico con tapa y sorbete.",
    detalles: ["Tamaño Grande (750ml)", "Opción Original o Zero"],
    precio: 6500, imagen: "/imagenes/coca.webp",
  },
  {
    id: 8, categoria: "bebidas", estilo: "silver", codigo: "BEBIDA 02",
    nombre: "Sprite", nombreCarrito: "Sprite 750ml",
    descripcion: "El toque fresco de lima-limón para refrescar tu función.",
    detalles: ["Tamaño Grande (750ml)", "Sabor Original o Sin Azúcar"],
    precio: 6500, imagen: "/imagenes/sprite.webp",
  },
  {
    id: 9, categoria: "bebidas", estilo: "silver", codigo: "BEBIDA 03",
    nombre: "Fanta Naranja", nombreCarrito: "Fanta Naranja 750ml",
    descripcion: "Intenso y refrescante sabor a naranja con hielo picado.",
    detalles: ["Tamaño Grande (750ml)", "Sabor Intenso Naranja"],
    precio: 6500, imagen: "/imagenes/fanta-naranja.png",
  },

  // golosinas
  {
    id: 10, categoria: "golosinas", estilo: "bronze", codigo: "DULCE 01",
    nombre: "Tableta Chocolate Milk", nombreCarrito: "Chocolate Milk 150g",
    descripcion: "Chocolate con leche cremoso de primera calidad con maní tostado.",
    detalles: ["Tableta de 150g", "Edición Cine"],
    precio: 7200, imagen: "/imagenes/milka.webp",
  },
  {
    id: 11, categoria: "golosinas", estilo: "bronze", codigo: "DULCE 02",
    nombre: "Confites Rocklets", nombreCarrito: "Confites Rocklets 200g",
    descripcion: "Crujientes confites rellenos de chocolate con leche multicolor.",
    detalles: ["Paquete Familiar 200g", "Ideal para compartir"],
    precio: 7900, imagen: "/imagenes/rocklets.webp",
  },
  {
    id: 12, categoria: "golosinas", estilo: "bronze", codigo: "DULCE 03",
    nombre: "Gomitas Ácidas Frutales", nombreCarrito: "Gomitas Ácidas 180g",
    descripcion: "Surtido de gomitas masticables cubierta con azúcar ácida.",
    detalles: ["Bolsa de 180g", "Sabores surtidos de fruta"],
    precio: 5800, imagen: "/imagenes/gomitas.webp",
  },

  // snacks
  {
    id: 13, categoria: "snacks", estilo: "golden", codigo: "SNACK 01",
    nombre: "Nachos con Cheddar Caliente", nombreCarrito: "Nachos con Queso",
    descripcion: "Crujientes tortillas de maíz horneadas acompañadas de salsa de queso cheddar caliente.",
    detalles: ["Porción Grande", "Salsa Cheddar tibia extra"],
    precio: 9100, imagen: "/imagenes/nachos.jpg", badge: "Hot",
  },
  {
    id: 14, categoria: "snacks", estilo: "golden", codigo: "SNACK 02",
    nombre: "Pancho XL Gourmet", nombreCarrito: "Pancho XL Gourmet",
    descripcion: "Salchicha alemana en pan de papa tierno con lluvia de papas pay y aderezos a elección.",
    detalles: ["Tamaño Extra Largo", "Salsas especiales incluidas"],
    precio: 8500, imagen: "/imagenes/pancho2.jpg", badge: "Hot",
  },
  {
    id: 15, categoria: "snacks", estilo: "bronze", codigo: "SNACK 03",
    nombre: "Papas Fritas Lays", nombreCarrito: "Papas Fritas 140g",
    descripcion: "Papas cortadas en rodajas finas, doradas y crocantes con el punto justo de sal.",
    detalles: ["Paquete Macro 140g", "Clásicas o Saborizadas"],
    precio: 6200, imagen: "/imagenes/papas.webp",
  },
];
