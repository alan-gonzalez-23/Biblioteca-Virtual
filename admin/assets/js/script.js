
initApp();
/* ============================================================
   INIT
   ============================================================ */
async function initApp() {
  setDate();
  try {
    await cargarDatos();
    buildChart();
  } catch (error) {
    console.error('Error inicializando la app:', error);
  }
}

async function cargarDatos() {
  await cargarCategorias();
  await cargarInventario();
  await cargarCursos();
  await cargarUsuarios();
  await cargarPrestamos();
  renderInventario();
  renderUsuarios();
  renderLoans();
  if (typeof renderStats === 'function') renderStats();
  agregarFilaPrestamo();
  populateLibroSelect();
  await cargarYRenderCategorias();
}

function setDate() {
  const d = new Date();
  document.getElementById('topbar-date').textContent = d.toLocaleDateString('es-AR', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}





