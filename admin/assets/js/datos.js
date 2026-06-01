
/* ============================================================
   STATE — Arrays de datos
   ============================================================ */
let libros = [
  { id: 1, titulo: 'El universo en una cáscara de nuez', autor: 'Hawking, Stephen', categoria: 'Ciencias', stock: 3, isbn: '978-0553802023' },
  { id: 2, titulo: 'Cien años de soledad', autor: 'García Márquez, Gabriel', categoria: 'Literatura', stock: 5, isbn: '978-0307474728' },
  { id: 3, titulo: 'Introducción a los Algoritmos', autor: 'Cormen, Thomas H.', categoria: 'Informática', stock: 2, isbn: '978-0262033848' },
  { id: 4, titulo: 'Historia Argentina', autor: 'Luna, Félix', categoria: 'Historia', stock: 4, isbn: '978-9500302760' },
  { id: 5, titulo: 'Cálculo, Vol. 1', autor: 'Apostol, Tom M.', categoria: 'Matemáticas', stock: 3, isbn: '978-0471000051' },
  { id: 6, titulo: 'Breve historia del tiempo', autor: 'Hawking, Stephen', categoria: 'Ciencias', stock: 2, isbn: '978-0553380163' },
  { id: 7, titulo: 'JavaScript: The Good Parts', autor: 'Crockford, Douglas', categoria: 'Informática', stock: 1, isbn: '978-0596517748' },
  { id: 8, titulo: 'Ficciones', autor: 'Borges, Jorge L.', categoria: 'Literatura', stock: 6, isbn: '978-9500301886' },
];
let nextLibroId = 9;

let prestamos = [
  { id: 1, nombre: 'Lucía Méndez', dni: '44.321.987', curso: '3° A', email: 'lucia@gmail.com', libro: 'Cien años de soledad', libroId: 2, fechaPrestamo: '2025-05-10', fechaDevolucion: '2025-05-24', estado: 'vencido' },
  { id: 2, nombre: 'Matías Rodríguez', dni: '45.678.123', curso: '5° B', email: 'matias@gmail.com', libro: 'Introducción a los Algoritmos', libroId: 3, fechaPrestamo: '2025-05-15', fechaDevolucion: '2025-05-29', estado: 'activo' },
  { id: 3, nombre: 'Valentina Torres', dni: '43.890.456', curso: '2° A', email: 'valen@gmail.com', libro: 'Historia Argentina', libroId: 4, fechaPrestamo: '2025-05-18', fechaDevolucion: '2025-06-01', estado: 'activo' },
  { id: 4, nombre: 'Franco Giménez', dni: '46.123.789', curso: '6° B', email: 'franco@gmail.com', libro: 'Breve historia del tiempo', libroId: 6, fechaPrestamo: '2025-04-20', fechaDevolucion: '2025-05-04', estado: 'devuelto' },
  { id: 5, nombre: 'Camila Suárez', dni: '44.567.321', curso: '4° A', email: 'cami@gmail.com', libro: 'Ficciones', libroId: 8, fechaPrestamo: '2025-05-22', fechaDevolucion: '2025-06-05', estado: 'activo' },
  { id: 6, nombre: 'Nicolás Herrera', dni: '43.210.654', curso: '1° B', email: 'nico@gmail.com', libro: 'JavaScript: The Good Parts', libroId: 7, fechaPrestamo: '2025-05-01', fechaDevolucion: '2025-05-15', estado: 'vencido' },
];
let nextPrestamoId = 7;