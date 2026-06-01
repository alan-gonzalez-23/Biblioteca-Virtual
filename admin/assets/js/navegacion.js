/* ============================================================
   NAVIGATION
   ============================================================ */
const sectionTitles = {
  prestamos: 'Gestión de Préstamos',
  alta: 'Alta de Préstamo',
  usuarios: 'Gestión de Usuarios',
  inventario: 'Inventario de Libros',
  categorias: 'Categorías',
  estadisticas: 'Estadísticas de Lectura',
};

function showSection(name, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('sec-' + name).classList.add('active');
  el.classList.add('active');
  document.getElementById('topbar-title').textContent = sectionTitles[name];
  if (name === 'alta') populateLibroSelect();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('active');
}
