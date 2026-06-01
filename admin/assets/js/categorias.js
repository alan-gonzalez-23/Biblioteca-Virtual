/* ============================================================
   CATEGORÍAS
   ============================================================ */

const COLORES_PRESET = [
  '#2563eb','#22c55e','#f59e0b','#ef4444','#8b5cf6',
  '#ec4899','#14b8a6','#f97316','#64748b','#0ea5e9',
];

function inicializarColorGridAlta() {
  const grid = document.getElementById('cat-color-grid');
  if (!grid || grid.children.length) return;
  COLORES_PRESET.forEach(hex => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = `width:28px;height:28px;border-radius:50%;background:${hex};border:3px solid transparent;cursor:pointer;transition:border .15s;`;
    btn.addEventListener('click', () => {
      document.getElementById('cat-color-input').value = hex;
      grid.querySelectorAll('button').forEach(b => b.style.borderColor = 'transparent');
      btn.style.borderColor = '#1e293b';
    });
    grid.appendChild(btn);
  });
}

async function cargarYRenderCategorias() {
  inicializarColorGridAlta();
  const [{ data: cats, error }, { data: librosData }] = await Promise.all([
    supabaseClient.from('categorias').select('id,nombre,descripcion,color,imagen_url').order('nombre', { ascending: true }),
    supabaseClient.from('libros').select('id_categoria'),
  ]);

  if (error) {
    console.error('Error al cargar categorías:', error.message);
    return;
  }

  const conteo = (librosData || []).reduce((acc, l) => {
    acc[l.id_categoria] = (acc[l.id_categoria] || 0) + 1;
    return acc;
  }, {});

  const tbody = document.getElementById('cat-tbody');
  tbody.innerHTML = '';

  if (!cats || !cats.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td'); td.colSpan = 5;
    td.style.cssText = 'text-align:center;color:var(--muted);padding:2rem;';
    td.textContent = 'No hay categorías registradas.';
    tr.appendChild(td); tbody.appendChild(tr);
    categorias = [];
    poblarCategorias();
    return;
  }

  cats.forEach((c, i) => {
    const tr = document.createElement('tr');

    const tdNum = document.createElement('td'); tdNum.textContent = i + 1;

    const tdNombre = document.createElement('td');
    const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;align-items:center;gap:.5rem;';
    if (c.color) {
      const dot = document.createElement('span');
      dot.style.cssText = `width:10px;height:10px;border-radius:50%;background:${c.color};flex-shrink:0;display:inline-block;`;
      wrap.appendChild(dot);
    }
    const nameSpan = document.createElement('span'); nameSpan.textContent = c.nombre;
    wrap.appendChild(nameSpan);
    tdNombre.appendChild(wrap);

    const tdDesc = document.createElement('td');
    tdDesc.style.cssText = 'color:var(--muted);font-size:.85rem;max-width:220px;';
    tdDesc.textContent = c.descripcion || '—';

    const tdLibros = document.createElement('td');
    const count = conteo[c.id] || 0;
    tdLibros.textContent = count;
    tdLibros.style.color = count === 0 ? 'var(--muted)' : 'var(--text)';

    const tdAcciones = document.createElement('td');
    const btnEditar = document.createElement('button');
    btnEditar.className = 'btn btn-ghost';
    btnEditar.style.cssText = 'padding:.35rem .7rem;font-size:.8rem;margin-right:.4rem;';
    btnEditar.textContent = '✏ Editar';
    btnEditar.addEventListener('click', () => abrirModalCategoria(c));

    const btnEliminar = document.createElement('button');
    btnEliminar.className = 'btn btn-danger';
    btnEliminar.style.cssText = 'padding:.35rem .7rem;font-size:.8rem;';
    btnEliminar.textContent = '🗑 Eliminar';
    btnEliminar.addEventListener('click', () => eliminarCategoria(c.id, c.nombre, count));

    tdAcciones.append(btnEditar, btnEliminar);
    tr.append(tdNum, tdNombre, tdDesc, tdLibros, tdAcciones);
    tbody.appendChild(tr);
  });

  categorias = cats;
  poblarCategorias();
}

async function procesarGuardadoCategoria() {
  const nombre = document.getElementById('cat-nombre').value.trim();
  const descripcion = document.getElementById('cat-desc').value.trim();
  const color = document.getElementById('cat-color-input').value.trim();
  const imagen_url = document.getElementById('cat-imagen').value.trim();

  if (!nombre) {
    mostrarNotificacion('Ingresá un nombre para la categoría.', 'warning');
    return;
  }
  const existe = categorias.find(c => c.nombre.toLowerCase() === nombre.toLowerCase());
  if (existe) {
    mostrarNotificacion('Ya existe una categoría con ese nombre.', 'warning');
    return;
  }

  const { error } = await supabaseClient.from('categorias').insert([{
    nombre,
    descripcion: descripcion || null,
    color: color || null,
    imagen_url: imagen_url || null,
  }]);

  if (error) {
    mostrarNotificacion('Error al crear la categoría: ' + error.message, 'error');
    return;
  }

  mostrarNotificacion(`Categoría "${nombre}" creada.`, 'success');
  document.getElementById('cat-nombre').value = '';
  document.getElementById('cat-desc').value = '';
  document.getElementById('cat-color-input').value = '';
  document.getElementById('cat-imagen').value = '';
  document.querySelectorAll('#cat-color-grid button').forEach(b => b.style.borderColor = 'transparent');
  await cargarYRenderCategorias();
}

/* ── MODAL EDICIÓN ── */
function abrirModalCategoria(cat) {
  document.getElementById('edit-cat-id').value = cat.id;
  document.getElementById('edit-cat-nombre').value = cat.nombre || '';
  document.getElementById('edit-cat-desc').value = cat.descripcion || '';
  document.getElementById('edit-cat-imagen').value = cat.imagen_url || '';

  // Presets de color
  const grid = document.getElementById('edit-cat-color-grid');
  grid.innerHTML = '';
  COLORES_PRESET.forEach(hex => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = `width:28px;height:28px;border-radius:50%;background:${hex};border:3px solid ${cat.color === hex ? '#1e293b' : 'transparent'};cursor:pointer;transition:border .15s;`;
    btn.addEventListener('click', () => {
      document.getElementById('edit-cat-color-input').value = hex;
      grid.querySelectorAll('button').forEach(b => b.style.borderColor = 'transparent');
      btn.style.borderColor = '#1e293b';
    });
    grid.appendChild(btn);
  });

  document.getElementById('edit-cat-color-input').value = cat.color || '';
  document.getElementById('modal-edit-cat').style.display = 'flex';
}

async function guardarEdicionCategoria() {
  const id = parseInt(document.getElementById('edit-cat-id').value);
  const nombre = document.getElementById('edit-cat-nombre').value.trim();
  const descripcion = document.getElementById('edit-cat-desc').value.trim();
  const color = document.getElementById('edit-cat-color-input').value.trim();
  const imagen_url = document.getElementById('edit-cat-imagen').value.trim();

  if (!nombre) {
    mostrarNotificacion('El nombre no puede estar vacío.', 'warning');
    return;
  }
  const existe = categorias.find(c => c.nombre.toLowerCase() === nombre.toLowerCase() && c.id !== id);
  if (existe) {
    mostrarNotificacion('Ya existe una categoría con ese nombre.', 'warning');
    return;
  }

  const { error } = await supabaseClient
    .from('categorias')
    .update({ nombre, descripcion: descripcion || null, color: color || null, imagen_url: imagen_url || null })
    .eq('id', id);

  if (error) {
    mostrarNotificacion('Error al guardar: ' + error.message, 'error');
    console.error(error);
    return;
  }

  mostrarNotificacion('Categoría actualizada.', 'success');
  document.getElementById('modal-edit-cat').style.display = 'none';
  await cargarYRenderCategorias();
}

function cerrarModalCategoria(e) {
  if (e.target === document.getElementById('modal-edit-cat'))
    document.getElementById('modal-edit-cat').style.display = 'none';
}

async function eliminarCategoria(id, nombre, countLibros) {
  if (countLibros > 0) {
    mostrarNotificacion(`No se puede eliminar "${nombre}" porque tiene ${countLibros} libro${countLibros !== 1 ? 's' : ''} asociado${countLibros !== 1 ? 's' : ''}.`, 'warning');
    return;
  }
  if (!window.confirm(`¿Eliminar la categoría "${nombre}"? Esta acción no se puede deshacer.`)) return;

  const { error } = await supabaseClient.from('categorias').delete().eq('id', id);
  if (error) {
    mostrarNotificacion('Error al eliminar: ' + error.message, 'error');
    console.error(error);
    return;
  }

  mostrarNotificacion(`Categoría "${nombre}" eliminada.`, 'success');
  await cargarYRenderCategorias();
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
