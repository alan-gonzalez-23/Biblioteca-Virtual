/* ============================================================
   VALIDACIÓN DE DATOS
   ============================================================ */

// Validar si un email es válido
function esEmailValido(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Validar si un DNI es válido (solo números, 7-8 dígitos)
function esDNIValido(dni) {
  const regex = /^\d{7,8}$/;
  return regex.test(String(dni).replace(/\D/g, ''));
}

// Validar si un teléfono es válido (al menos 8 dígitos)
function esTelefonoValido(tel) {
  const soloNumeros = String(tel).replace(/\D/g, '');
  return soloNumeros.length >= 8;
}

/* ============================================================
   PRÉSTAMOS
   ============================================================ */
let prestamos = [];
let cursos = [];

async function cargarCursos() {
  const { data, error } = await supabaseClient
    .from('cursos')
    .select('id,nombre,division')
    .order('nombre', { ascending: true })
    .order('division', { ascending: true });

  if (error) {
    console.error('Error al cargar cursos:', error.message);
    return;
  }

  cursos = data || [];
  const sel = document.getElementById('f-curso');
  if (!sel) return;
  sel.innerHTML = '<option value="">Seleccioná curso</option>' + cursos.map(c => `<option value="${c.nombre}|${c.division}">${c.nombre}° ${c.division}</option>`).join('');
}

async function obtenerOCrearCurso(ano, division) {
  if (!ano || !division) return null;
  const { data: cursoExistente, error } = await supabaseClient
    .from('cursos')
    .select('id')
    .eq('nombre', ano)
    .eq('division', division)
    .maybeSingle();

  if (error) throw error;
  if (cursoExistente) return cursoExistente.id;

  const { data: cursoCreado, error: errorCursoCreado } = await supabaseClient
    .from('cursos')
    .insert([{ ano, division }])
    .select()
    .single();

  if (errorCursoCreado) throw errorCursoCreado;
  return cursoCreado.id;
}

async function obtenerOCrearUsuario({ nombre, apellido, dni, email, telefono, direccion, id_curso, anio_actual }) {
  const { data: usuarioExistente, error } = await supabaseClient
    .from('usuarios')
    .select('id')
    .eq('dni', dni)
    .maybeSingle();

  if (error) throw error;
  if (usuarioExistente) return usuarioExistente.id;

  const { data: usuarioCreado, error: errorUsuario } = await supabaseClient
    .from('usuarios')
    .insert([{ nombre, apellido, dni, email, telefono, direccion, id_curso, 'año_actual': anio_actual }])
    .select()
    .single();

  if (errorUsuario) throw errorUsuario;
  return usuarioCreado.id;
}

async function cargarPrestamos() {
  const [{ data: prestamosData, error: errorPrestamos },
         { data: usuariosData, error: errorUsuarios },
         { data: cursosData, error: errorCursos },
         { data: librosData, error: errorLibros },
         { data: stockData, error: errorStock }] = await Promise.all([
    supabaseClient.from('prestamos').select('id,id_stock,id_usuario,fecha_prestamo,fecha_devolucion,estado').order('fecha_prestamo', { ascending: false }),
    supabaseClient.from('usuarios').select('id,nombre,apellido,dni,email,telefono,direccion,id_curso,año_actual'),
    supabaseClient.from('cursos').select('id,nombre,division'),
    supabaseClient.from('libros').select('id,titulo'),
    supabaseClient.from('stock').select('id,id_libro,isbn'),
  ]);

  if (errorPrestamos) {
    console.error('Error al cargar préstamos:', errorPrestamos.message);
    return;
  }
  if (errorUsuarios) {
    console.error('Error al cargar usuarios:', errorUsuarios.message);
    return;
  }
  if (errorCursos) {
    console.error('Error al cargar cursos:', errorCursos.message);
    return;
  }
  if (errorLibros) {
    console.error('Error al cargar libros para préstamos:', errorLibros.message);
    return;
  }

  const usuariosMap = (usuariosData || []).reduce((acc, usuario) => {
    acc[usuario.id] = usuario;
    return acc;
  }, {});

  const cursosMap = (cursosData || []).reduce((acc, curso) => {
    acc[curso.id] = curso;
    return acc;
  }, {});

  const librosMap = (librosData || []).reduce((acc, libro) => {
    acc[libro.id] = libro;
    return acc;
  }, {});
  const stockMap = (stockData || []).reduce((acc, stock) => {
    acc[stock.id] = stock;
    return acc;
  }, {});

  prestamos = (prestamosData || []).map(item => {
    const usuario = usuariosMap[item.id_usuario] || {};
    const curso = usuario.id_curso ? cursosMap[usuario.id_curso] : null;
    const stock = item.id_stock ? stockMap[item.id_stock] : null;
    const libro = stock ? librosMap[stock.id_libro] : null;

    return {
      id: item.id,
      nombre: usuario.nombre ? `${usuario.nombre} ${usuario.apellido}` : 'Usuario desconocido',
      dni: usuario.dni || '—',
      curso: curso ? `${curso.nombre} ${curso.division}` : '—',
      email: usuario.email || '—',
      tel: usuario.telefono || '',
      domicilio: usuario.direccion || '',
      libro: libro ? libro.titulo : 'Libro eliminado',
      isbn: stock ? stock.isbn : '—',
      libroId: libro ? libro.id : null,
      stockId: item.id_stock,
      fechaPrestamo: item.fecha_prestamo,
      fechaDevolucion: item.fecha_devolucion,
      estado: item.estado,
    };
  });
}

function renderLoans() {
  const q = document.getElementById('loan-search').value.toLowerCase();
  const filtro = document.getElementById('loan-filter').value;
  const orden = document.getElementById('loan-sort').value;

  let lista = prestamos.filter(p => {
    const matchQ = p.nombre.toLowerCase().includes(q) || p.libro.toLowerCase().includes(q) || p.dni.includes(q);
    const matchF = filtro === 'todos' || p.estado === filtro;
    return matchQ && matchF;
  });

  if (orden === 'fecha-desc') lista.sort((a,b) => (b.fechaPrestamo || '').localeCompare(a.fechaPrestamo || ''));
  else if (orden === 'fecha-asc') lista.sort((a,b) => (a.fechaPrestamo || '').localeCompare(b.fechaPrestamo || ''));
  else lista.sort((a,b) => a.nombre.localeCompare(b.nombre));

  const container = document.getElementById('loan-list');
  const empty = document.getElementById('loan-empty');
  container.innerHTML = '';

  empty.style.display = lista.length ? 'none' : 'block';
  if (!lista.length) return;

  // Botón recordatorios: mostrar solo si hay préstamos activos/vencidos con email válido
  const conEmail = lista.filter(p => p.estado !== 'devuelto' && p.email && p.email !== '—' && esEmailValido(p.email));
  const btnRecordatorio = document.getElementById('btn-recordatorios');
  if (btnRecordatorio) btnRecordatorio.style.display = conEmail.length ? 'inline-flex' : 'none';

  lista.forEach(p => {
    const initials = p.nombre.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
    const estadoMap = { activo: ['badge-green','Activo'], vencido: ['badge-red','Vencido'], devuelto: ['badge-blue','Devuelto'] };
    const [badgeClass, badgeText] = estadoMap[p.estado] || ['badge-gray', p.estado];

    const div = document.createElement('div');
    div.className = 'loan-card';

    const avatarDiv = document.createElement('div'); avatarDiv.className = 'loan-avatar'; avatarDiv.textContent = initials;
    const infoDiv = document.createElement('div'); infoDiv.className = 'loan-info';
    const nameDiv = document.createElement('div'); nameDiv.className = 'loan-name';
    nameDiv.textContent = p.nombre + ' · ';
    const dniSpan = document.createElement('span'); dniSpan.style.cssText = 'font-weight:400;color:var(--muted);'; dniSpan.textContent = 'DNI ' + p.dni;
    nameDiv.appendChild(dniSpan);
    const metaDiv = document.createElement('div'); metaDiv.className = 'loan-meta';
    metaDiv.textContent = `📗 ${p.libro}${p.isbn && p.isbn !== '—' ? ' · ' + p.isbn : ''} · ${p.curso} · Vence: ${formatDate(p.fechaDevolucion)}`;
    infoDiv.append(nameDiv, metaDiv);

    const actionsDiv = document.createElement('div'); actionsDiv.className = 'loan-actions';
    const badge = document.createElement('span'); badge.className = `badge ${badgeClass}`; badge.textContent = badgeText;
    actionsDiv.appendChild(badge);
    if (p.estado !== 'devuelto') {
      const btn = document.createElement('button'); btn.className = 'btn btn-success'; btn.textContent = '✔ Devuelto';
      btn.addEventListener('click', () => marcarDevuelto(p.id));
      actionsDiv.appendChild(btn);
    }

    div.append(avatarDiv, infoDiv, actionsDiv);
    container.appendChild(div);
  });
}

async function marcarDevuelto(id) {
  const { error } = await supabaseClient
    .from('prestamos')
    .update({ estado: 'devuelto' })
    .eq('id', id);

  if (error) {
    mostrarNotificacion('Error al marcar el préstamo como devuelto: ' + error.message, 'error');
    console.error(error);
    return;
  }

  await cargarPrestamos();
  renderLoans();
  if (typeof renderStats === 'function') renderStats();
  mostrarNotificacion('✔ Préstamo marcado como devuelto', 'success');
}

function formatDate(str) {
  if (!str) return '—';
  const [y,m,d] = str.split('-');
  return `${d}/${m}/${y}`;
}

/* ============================================================
   ALTA PRÉSTAMO
   ============================================================ */
let filaPrestamoCount = 0;

function agregarFilaPrestamo() {
  const contenedor = document.getElementById('filas-prestamo');

  const fila = document.createElement('div');
  fila.className = 'fila-prestamo';
  fila.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:.75rem;align-items:end;background:var(--bg);border-radius:10px;padding:.75rem;';

  const divLibro = document.createElement('div');
  const lblLibro = document.createElement('label'); lblLibro.className = 'form-label'; lblLibro.textContent = 'Libro *';
  const selLibro = document.createElement('select'); selLibro.className = 'form-input form-select';
  selLibro.innerHTML = '<option value="">Seleccioná un libro</option>';
  libros.forEach(l => {
    const o = document.createElement('option'); o.value = l.id;
    o.textContent = `${l.titulo} (Stock: ${l.stock})`;
    if (l.stock === 0) { o.disabled = true; o.textContent += ' — Sin stock'; }
    selLibro.appendChild(o);
  });
  divLibro.append(lblLibro, selLibro);

  const divIsbn = document.createElement('div');
  const lblIsbn = document.createElement('label'); lblIsbn.className = 'form-label'; lblIsbn.textContent = 'Ejemplar *';
  const selIsbn = document.createElement('select'); selIsbn.className = 'form-input form-select';
  selIsbn.innerHTML = '<option value="">Primero seleccioná libro</option>';
  divIsbn.append(lblIsbn, selIsbn);

  const divFecha = document.createElement('div');
  const lblFecha = document.createElement('label'); lblFecha.className = 'form-label'; lblFecha.textContent = 'Devolución *';
  const inputFecha = document.createElement('input'); inputFecha.className = 'form-input'; inputFecha.type = 'date';
  divFecha.append(lblFecha, inputFecha);

  const btnEliminar = document.createElement('button');
  btnEliminar.className = 'btn btn-danger'; btnEliminar.textContent = '✕';
  btnEliminar.addEventListener('click', () => {
    if (document.querySelectorAll('.fila-prestamo').length > 1) fila.remove();
  });

  selLibro.addEventListener('change', () => {
    const bookId = parseInt(selLibro.value);
    selIsbn.innerHTML = '<option value="">Seleccioná ejemplar</option>';
    if (!bookId) return;
    const book = libros.find(b => b.id === bookId);
    if (!book || !book.stockItems.length) {
      selIsbn.innerHTML = '<option value="">Sin ejemplares</option>'; return;
    }
    const prestadosIds = prestamos.filter(p => p.estado !== 'devuelto').map(p => p.stockId);
    const seleccionadosEnForm = Array.from(document.querySelectorAll('.fila-prestamo'))
      .filter(f => f !== fila)
      .map(f => parseInt(f.querySelectorAll('select')[1].value))
      .filter(Boolean);
    const disponibles = book.stockItems.filter(item =>
      !prestadosIds.includes(item.id) && !seleccionadosEnForm.includes(item.id)
    );
    if (!disponibles.length) {
      selIsbn.innerHTML = '<option value="">Sin ejemplares disponibles</option>'; return;
    }
    disponibles.forEach(item => {
      const o = document.createElement('option'); o.value = item.id; o.textContent = item.isbn;
      selIsbn.appendChild(o);
    });
  });

  fila.append(divLibro, divIsbn, divFecha, btnEliminar);
  contenedor.appendChild(fila);
}

function populateLibroSelect() {
  if (!document.querySelector('.fila-prestamo')) agregarFilaPrestamo();
}

async function registrarPrestamo() {
  const nombre = document.getElementById('f-nombre').value.trim();
  const dni = document.getElementById('f-dni').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const curso = document.getElementById('f-curso').value;

  const errDiv = document.getElementById('alta-alert-err');
  const okDiv = document.getElementById('alta-alert-ok');
  errDiv.style.display = 'none'; okDiv.style.display = 'none';

  // Validaciones mejoradas
  if (!nombre || !dni || !email || !curso) {
    errDiv.textContent = '⚠ Completá todos los datos del alumno.';
    errDiv.style.display = 'block';
    setTimeout(() => errDiv.style.display = 'none', 3500);
    return;
  }

  if (!esDNIValido(dni)) {
    errDiv.textContent = '⚠ El DNI debe contener 7 u 8 números.';
    errDiv.style.display = 'block';
    setTimeout(() => errDiv.style.display = 'none', 3500);
    return;
  }

  if (!esEmailValido(email)) {
    errDiv.textContent = '⚠ El email no es válido (ej: alumno@gmail.com).';
    errDiv.style.display = 'block';
    setTimeout(() => errDiv.style.display = 'none', 3500);
    return;
  }

  const tel = document.getElementById('f-tel').value.trim();
  if (tel && !esTelefonoValido(tel)) {
    errDiv.textContent = '⚠ El teléfono debe contener al menos 8 dígitos.';
    errDiv.style.display = 'block';
    setTimeout(() => errDiv.style.display = 'none', 3500);
    return;
  }

  const filas = document.querySelectorAll('.fila-prestamo');
  const items = [];
  for (const fila of filas) {
    const selects = fila.querySelectorAll('select');
    const inputFecha = fila.querySelector('input[type="date"]');
    const stockId = parseInt(selects[1].value);
    const devolucion = inputFecha.value;
    if (!parseInt(selects[0].value) || !stockId || !devolucion) {
      errDiv.textContent = '⚠ Completá libro, ejemplar y fecha en todas las filas.';
      errDiv.style.display = 'block';
      setTimeout(() => errDiv.style.display = 'none', 3500);
      return;
    }
    items.push({ stockId, devolucion });
  }

  try {
    const [ano, division] = curso.split('|');
    const idCurso = await obtenerOCrearCurso(ano, division);

    const partesNombre = nombre.split(' ').map(p => p.trim()).filter(Boolean);
    const apellidoAlumno = partesNombre.length > 1 ? partesNombre.pop() : 'Desconocido';
    const nombreAlumno = partesNombre.join(' ') || nombre;

    const usuarioId = await obtenerOCrearUsuario({
      nombre: nombreAlumno,
      apellido: apellidoAlumno,
      dni,
      email,
      telefono: document.getElementById('f-tel').value.trim(),
      direccion: document.getElementById('f-dom').value.trim(),
      id_curso: idCurso,
      anio_actual: parseInt(document.getElementById('f-anio').value, 10),
    });

    const registros = items.map(item => ({
      id_stock: item.stockId,
      id_usuario: usuarioId,
      fecha_prestamo: new Date().toISOString().split('T')[0],
      fecha_devolucion: item.devolucion,
      estado: 'activo',
    }));

    const { error } = await supabaseClient.from('prestamos').insert(registros);
    if (error) throw error;

    okDiv.textContent = `✅ ${registros.length} préstamo${registros.length > 1 ? 's' : ''} registrado${registros.length > 1 ? 's' : ''} correctamente.`;
    okDiv.style.display = 'block';
    setTimeout(() => okDiv.style.display = 'none', 3000);
    limpiarFormulario();
    await cargarPrestamos();
    await cargarInventario();
    renderLoans();
    if (typeof renderStats === 'function') renderStats();
    renderInventario();
  } catch (error) {
    console.error(error);
    errDiv.textContent = 'Error al registrar el préstamo: ' + error.message;
    errDiv.style.display = 'block';
  }
}

function limpiarFormulario() {
  ['f-nombre','f-dni','f-tel','f-email','f-dom'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-curso').value = '';
  document.getElementById('filas-prestamo').innerHTML = '';
  filaPrestamoCount = 0;
  agregarFilaPrestamo();
}

// Buscar usuario por DNI (primero en cache `usuarios`, si no, en Supabase)
async function buscarUsuarioPorDNI(dni) {
  if (!dni) return null;
  // buscar en cache local (carga realizada por cargarUsuarios)
  if (typeof usuarios !== 'undefined' && usuarios.length) {
    const u = usuarios.find(x => String(x.dni) === String(dni));
    if (u) return u;
  }

  // fallback: consultar a la base
  try {
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('id,nombre,apellido,dni,email,telefono,direccion,año_actual,id_curso')
      .eq('dni', dni)
      .maybeSingle();
    if (error) {
      console.error('Error buscando usuario por DNI:', error.message);
      return null;
    }
    return data || null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

// Rellena el formulario de préstamo con los datos del usuario
async function autofillUsuarioEnFormulario(dni) {
  const user = await buscarUsuarioPorDNI(dni);
  if (!user) return false;

  // Nombre completo
  const nombreField = document.getElementById('f-nombre');
  const dniField = document.getElementById('f-dni');
  const telField = document.getElementById('f-tel');
  const emailField = document.getElementById('f-email');
  const domField = document.getElementById('f-dom');
  const cursoSel = document.getElementById('f-curso');
  const anioSel = document.getElementById('f-anio');

  if (nombreField) nombreField.value = `${user.nombre || ''} ${user.apellido || ''}`.trim();
  if (dniField) dniField.value = user.dni || '';
  if (telField) telField.value = user.telefono || '';
  if (emailField) emailField.value = user.email || '';
  if (domField) domField.value = user.direccion || '';

  // Seleccionar curso en el select (buscamos por id_curso en el array `cursos`)
  if (cursoSel && user.id_curso) {
    const cursoObj = cursos.find(c => c.id === user.id_curso);
    if (cursoObj) {
      cursoSel.value = `${cursoObj.nombre}|${cursoObj.division}`;
    }
  }

  // Año lectivo (campo en la tabla: 'año_actual')
  if (anioSel) {
    const año = user['año_actual'] || user.ano_actual || user.ano || '';
    if (año) anioSel.value = String(año);
  }

  return true;
}

const EMAILJS_SERVICE  = 'service_bytd01h';
const EMAILJS_TEMPLATE = 'template_899iqtk';
const EMAILJS_KEY      = '1Uu73DKwGR4ADExX9';

async function enviarRecordatorios() {
  emailjs.init(EMAILJS_KEY);

  const hoy = new Date();
  const pendientes = prestamos.filter(p =>
    p.estado !== 'devuelto' && 
    p.email && 
    p.email !== '—' &&
    esEmailValido(p.email)  // ← VALIDACIÓN: solo emails válidos
  );
  
  if (!pendientes.length) {
    mostrarNotificacion('⚠ No hay préstamos pendientes con emails válidos para recordar', 'warning');
    return;
  }

  // Agrupar por usuario para enviar un email por alumno (no por préstamo)
  const porUsuario = {};
  pendientes.forEach(p => {
    if (!porUsuario[p.email]) {
      porUsuario[p.email] = [];
    }
    porUsuario[p.email].push(p);
  });

  let enviados = 0;
  let errores = 0;
  
  for (const email in porUsuario) {
    const prestamosDel = porUsuario[email];
    const primerPrestamo = prestamosDel[0];
    
    const diasRestantes = Math.ceil((new Date(primerPrestamo.fechaDevolucion) - hoy) / 86400000);
    const estadoTexto = diasRestantes < 0
      ? `VENCIDO hace ${Math.abs(diasRestantes)} día(s)`
      : `vence en ${diasRestantes} día(s) (${formatDate(primerPrestamo.fechaDevolucion)})`;

    // Crear lista de libros con sus estados
    const librosLista = prestamosDel.map(p => {
      const diasLibro = Math.ceil((new Date(p.fechaDevolucion) - hoy) / 86400000);
      const estadoLibro = diasLibro < 0 ? 'VENCIDO' : 'Pendiente';
      return `• ${p.libro} (${estadoLibro})`;
    }).join('\n');

    try {
      await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
        to_email:  email,
        to_name:   primerPrestamo.nombre,
        libro:     librosLista,
        estado:    estadoTexto,
      });
      enviados++;
    } catch (error) {
      console.error(`Error enviando email a ${email}:`, error);
      errores++;
    }
  }

  if (errores > 0) {
    mostrarNotificacion(`✅ Enviados: ${enviados} | ❌ Errores: ${errores}`, 'warning');
  } else {
    mostrarNotificacion(`✅ Recordatorios enviados a ${enviados} alumno(s)`, 'success');
  }
}

function mostrarNotificacion(msg, tipo = 'success') {
  let toast = document.getElementById('toast-notif');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notif';
    toast.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;padding:.75rem 1.25rem;border-radius:.5rem;color:#fff;font-size:.9rem;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.2);transition:opacity 200ms;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.background = tipo === 'success' ? '#22c55e' : tipo === 'error' ? '#ef4444' : '#f59e0b';
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// Añadir listeners al campo DNI para autocompletar cuando exista el DOM
document.addEventListener('DOMContentLoaded', () => {
  const dniInput = document.getElementById('f-dni');
  if (!dniInput) return;

  // En blur intentamos autocompletar
  dniInput.addEventListener('blur', async () => {
    const val = dniInput.value.trim();
    if (!val) return;
    await autofillUsuarioEnFormulario(val);
  });

  // En Enter también: evita que el formulario se envíe si lo hay
  dniInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = dniInput.value.trim();
      if (!val) return;
      await autofillUsuarioEnFormulario(val);
    }
  });
});
