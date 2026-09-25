// Script de filtermap.html (vinculado con <script src="index.js" defer>).

const resultado = document.getElementById("resultado");

// Si esto aparece en la consola (F12 -> Console), el archivo quedó bien
// vinculado al HTML.
console.log("index.js cargado", resultado);

let productos = [
  { id: 1, nombre: "Audífonos Bluetooth",   categoria: "audio",       precio: 89000,  stock: 12, enOferta: true  },
  { id: 2, nombre: "Mouse inalámbrico",      categoria: "accesorios", precio: 45000,  stock: 0,  enOferta: false },
  { id: 3, nombre: "Teclado mecánico",       categoria: "accesorios", precio: 150000, stock: 5,  enOferta: true  },
  { id: 4, nombre: "Parlante portátil",      categoria: "audio",      precio: 120000, stock: 8,  enOferta: false },
  { id: 5, nombre: "Cargador rápido 65W",    categoria: "energia",    precio: 60000,  stock: 20, enOferta: true  },
  { id: 6, nombre: "Power bank 10000mAh",    categoria: "energia",    precio: 75000,  stock: 0,  enOferta: false },
];

const catalogoDeOfertas = productos
  .filter(function (p) {
    return p.stock >0 && p.enOferta; // TODO: mismo criterio del Ejercicio 5
  })

  .map(function (p) {
    return {
      nombre: p.nombre,
      precio: p.precio,
    };
  })
  /* TODO: encadena aquí un .map() con el mismo formato del Ejercicio 7 */;

console.log(catalogoDeOfertas);