/* ============================================================
   USUARIOS
   ============================================================ */
let usuarios = [];

function escapeHtml(val) {
  return String(val ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function mostrarNotificacion(msg, tipo = 'success') {
  let toast = document.getElementById('toast-notif');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notif';
    toast.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;padding:.75rem 1.25rem;border-radius:.5rem;color:#fff;font-size:.9rem;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.2);transition:opacity .3s;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.background = tipo === 'success' ? '#22c55e' : tipo === 'error' ? '#ef4444' : '#f59e0b';
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

async function cargarUsuarios() {
  const { data, error } = await supabaseClient
    .from('usuarios')
    .select('id,nombre,apellido,dni,email,telefono,direccion,año_actual,id_curso')
    .order('apellido', { ascending: true })
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error al cargar usuarios:', error.message);
    return;
  }

  usuarios = (data || []).map(u => ({
    ...u,
    curso: obtenerNombreCurso(u.id_curso),
  }));
  poblarCursosUsuario();
}

function obtenerNombreCurso(idCurso) {
  const curso = cursos.find(c => c.id === idCurso);
  return curso ? `${curso.nombre} ${curso.division}` : '—';
}

function poblarCursosUsuario() {
  const sel = document.getElementById('user-curso');
  if (!sel) return;
  sel.innerHTML = '<option value="">Seleccioná curso</option>' + cursos
    .map(c => `<option value="${c.nombre}|${c.division}">${c.nombre}° ${c.division}</option>`)
    .join('');
}

function renderUsuarios() {
  const q = document.getElementById('user-search').value.toLowerCase();
const lista = usuarios.filter(u => {
  const nombreCompleto = `${u.nombre} ${u.apellido}`.toLowerCase();
  // Convertimos el DNI a string de forma segura antes de buscar
  const dniString = u.dni ? String(u.dni) : ''; 
  
  return nombreCompleto.includes(q)
    || dniString.includes(q)
    || (u.email || '').toLowerCase().includes(q)
    || (u.curso || '').toLowerCase().includes(q);
});


  const tbody = document.getElementById('user-tbody');
  tbody.innerHTML = '';

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:2rem;">No hay usuarios que coincidan.</td></tr>`;
    return;
  }

  lista.forEach((u, i) => {
    const tr = document.createElement('tr');

    const btnEditar = document.createElement('button');
    btnEditar.className = 'btn btn-ghost';
    btnEditar.style.cssText = 'padding:.35rem .7rem;font-size:.8rem;margin-right:.4rem;';
    btnEditar.textContent = '✏ Editar';
    btnEditar.addEventListener('click', () => abrirEdicionUsuario(u.id));

    const btnEliminar = document.createElement('button');
    btnEliminar.className = 'btn btn-danger';
    btnEliminar.style.cssText = 'padding:.35rem .7rem;font-size:.8rem;';
    btnEliminar.textContent = '🗑 Eliminar';
    btnEliminar.addEventListener('click', () => eliminarUsuario(u.id));

    const tdNum = document.createElement('td'); tdNum.style.padding = '0'; tdNum.textContent = i + 1;
    const tdNombre = document.createElement('td'); tdNombre.textContent = `${u.nombre} ${u.apellido}`;
    const tdDni = document.createElement('td'); tdDni.textContent = u.dni;
    const tdEmail = document.createElement('td'); tdEmail.textContent = u.email || '—';
    const tdTel = document.createElement('td'); tdTel.textContent = u.telefono || '—';
    const tdCurso = document.createElement('td'); tdCurso.textContent = u.curso || '—';
    const tdAccion = document.createElement('td');
    tdAccion.append(btnEditar, btnEliminar);

    tr.append(tdNum, tdNombre, tdDni, tdEmail, tdTel, tdCurso, tdAccion);
    tbody.appendChild(tr);
  });
}

async function procesarGuardadoUsuario() {
  const nombre = document.getElementById('user-nombre').value.trim();
  const apellido = document.getElementById('user-apellido').value.trim();
  const dni = document.getElementById('user-dni').value.trim();
  const email = document.getElementById('user-email').value.trim();
  const telefono = document.getElementById('user-tel').value.trim();
  const direccion = document.getElementById('user-dom').value.trim();
  const cursoText = document.getElementById('user-curso').value;
  const anioActual = parseInt(document.getElementById('user-anio').value, 10) || new Date().getFullYear();

  if (!nombre || !apellido || !dni || !cursoText) {
    mostrarNotificacion('Completá nombre, apellido, DNI y curso para crear el usuario.', 'warning');
    return;
  }

  const [ano, division] = cursoText.split('|');
  if (!ano || !division) {
    mostrarNotificacion('Seleccioná un curso válido.', 'warning');
    return;
  }

  const idCurso = await obtenerOCrearCurso(ano, division);
  if (!idCurso) {
    mostrarNotificacion('No se pudo cargar el curso asociado.', 'error');
    return;
  }

  const { error } = await supabaseClient
    .from('usuarios')
    .insert([{ nombre, apellido, dni, email, telefono, direccion, id_curso: idCurso, año_actual: anioActual }]);

  if (error) {
    mostrarNotificacion('Error al guardar usuario: ' + error.message, 'error');
    console.error(error);
    return;
  }

  mostrarNotificacion('Usuario guardado correctamente.', 'success');
  await cargarUsuarios();
  renderUsuarios();
  limpiarFormularioUsuario();
}

function limpiarFormularioUsuario() {
  ['user-nombre', 'user-apellido', 'user-dni', 'user-email', 'user-tel', 'user-dom', 'user-curso'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const anio = document.getElementById('user-anio');
  if (anio) anio.value = new Date().getFullYear();
}

async function eliminarUsuario(id) {
  if (!window.confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;

  const { error } = await supabaseClient
    .from('usuarios')
    .delete()
    .eq('id', id);

  if (error) {
    mostrarNotificacion('Error al eliminar usuario: ' + error.message, 'error');
    console.error(error);
    return;
  }

  mostrarNotificacion('Usuario eliminado.', 'success');
  await cargarUsuarios();
  renderUsuarios();
}

function abrirEdicionUsuario(id) {
  const u = usuarios.find(x => x.id === id);
  if (!u) return;

  document.getElementById('edit-user-id').value = id;
  document.getElementById('edit-user-nombre').value = u.nombre || '';
  document.getElementById('edit-user-apellido').value = u.apellido || '';
  document.getElementById('edit-user-dni').value = u.dni || '';
  document.getElementById('edit-user-email').value = u.email || '';
  document.getElementById('edit-user-tel').value = u.telefono || '';
  document.getElementById('edit-user-dom').value = u.direccion || '';

  // Poblar y seleccionar curso
  const sel = document.getElementById('edit-user-curso');
  sel.innerHTML = '<option value="">Seleccioná curso</option>' + cursos
    .map(c => `<option value="${c.nombre}|${c.division}">${c.nombre}° ${c.division}</option>`)
    .join('');
  if (u.id_curso) {
    const curso = cursos.find(c => c.id === u.id_curso);
    if (curso) sel.value = `${curso.nombre}|${curso.division}`;
  }

  const modal = document.getElementById('modal-edit-usuario');
  modal.style.display = 'flex';
}

async function guardarEdicionUsuario() {
  const id = parseInt(document.getElementById('edit-user-id').value);
  const nombre = document.getElementById('edit-user-nombre').value.trim();
  const apellido = document.getElementById('edit-user-apellido').value.trim();
  const dni = document.getElementById('edit-user-dni').value.trim();
  const email = document.getElementById('edit-user-email').value.trim();
  const telefono = document.getElementById('edit-user-tel').value.trim();
  const direccion = document.getElementById('edit-user-dom').value.trim();
  const cursoText = document.getElementById('edit-user-curso').value;

  if (!nombre || !apellido || !dni || !cursoText) {
    mostrarNotificacion('Completá nombre, apellido, DNI y curso.', 'warning');
    return;
  }

  const [ano, division] = cursoText.split('|');
  const idCurso = await obtenerOCrearCurso(ano, division);
  if (!idCurso) {
    mostrarNotificacion('No se pudo cargar el curso.', 'error');
    return;
  }

  const { error } = await supabaseClient
    .from('usuarios')
    .update({ nombre, apellido, dni, email, telefono, direccion, id_curso: idCurso })
    .eq('id', id);

  if (error) {
    mostrarNotificacion('Error al actualizar usuario: ' + error.message, 'error');
    console.error(error);
    return;
  }

  mostrarNotificacion('Usuario actualizado correctamente.', 'success');
  document.getElementById('modal-edit-usuario').style.display = 'none';
  await cargarUsuarios();
  renderUsuarios();
}

function cerrarModalUsuario(e) {
  if (e.target === document.getElementById('modal-edit-usuario'))
    document.getElementById('modal-edit-usuario').style.display = 'none';
}
