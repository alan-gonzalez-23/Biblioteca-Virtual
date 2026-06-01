/* ============================================================
  INVENTARIO
   ============================================================ */
let libros = [];
let categorias = [];

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

async function cargarCategorias() {
  const { data, error } = await supabaseClient
    .from('categorias')
    .select('id,nombre')
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error al cargar categorías:', error.message);
    return;
  }

  categorias = data || [];
  poblarCategorias();
}

function poblarCategorias() {
  const catSelect = document.getElementById('inv-cat');
  const editCatSelect = document.getElementById('edit-cat');
  const filterSelect = document.getElementById('inv-cat-filter');

  if (catSelect) {
    catSelect.innerHTML = categorias.map(c => `<option value="${escapeHtml(c.nombre)}">${escapeHtml(c.nombre)}</option>`).join('');
  }
  if (editCatSelect) {
    editCatSelect.innerHTML = categorias.map(c => `<option value="${escapeHtml(c.nombre)}">${escapeHtml(c.nombre)}</option>`).join('');
  }
  if (filterSelect) {
    filterSelect.innerHTML = '<option value="">Todas las categorías</option>' + categorias.map(c => `<option value="${escapeHtml(c.nombre)}">${escapeHtml(c.nombre)}</option>`).join('');
  }
}

async function cargarInventario() {
  const { data: librosData, error: errorLibros } = await supabaseClient
    .from('libros')
    .select(`id,titulo,url_drive,palabras_clave,id_autor,id_categoria,autores(id,nombre,apellido),categorias(id,nombre)`);

  if (errorLibros) {
    console.error('Error al cargar libros:', errorLibros.message);
    return;
  }

  const { data: stockData, error: errorStock } = await supabaseClient
    .from('stock')
    .select('id,id_libro,isbn');

  if (errorStock) {
    console.error('Error al cargar stock:', errorStock.message);
    return;
  }

  const stockMap = (stockData || []).reduce((acc, item) => {
    if (!acc[item.id_libro]) acc[item.id_libro] = [];
    acc[item.id_libro].push(item);
    return acc;
  }, {});

  libros = (librosData || []).map(book => {
    const autor = book.autores ? `${book.autores.apellido}, ${book.autores.nombre}` : '';
    const categoria = book.categorias ? book.categorias.nombre : '';
    const stockItems = stockMap[book.id] || [];

    return {
      id: book.id,
      titulo: book.titulo,
      autor,
      categoria,
      stock: stockItems.length,
      isbns: stockItems.map(item => item.isbn),
      stockItems,
      id_autor: book.id_autor,
      id_categoria: book.id_categoria,
      url_drive: book.url_drive || '',
      palabras_clave: book.palabras_clave || '',
    };
  });
}

function renderInventario() {
  const q = document.getElementById('inv-search').value.toLowerCase();
  const cat = document.getElementById('inv-cat-filter').value;

  const lista = libros.filter(l => {
    const matchQ = l.titulo.toLowerCase().includes(q)
      || l.autor.toLowerCase().includes(q)
      || (l.palabras_clave || '').toLowerCase().includes(q);
    const matchC = !cat || l.categoria === cat;
    return matchQ && matchC;
  });

  const tbody = document.getElementById('inv-tbody');
  tbody.innerHTML = '';

  lista.forEach((l, i) => {
    const stockColor = l.stock === 0 ? 'color:var(--danger);font-weight:700;' : l.stock <= 1 ? 'color:var(--warning);font-weight:600;' : '';
    const tr = document.createElement('tr');

    const btnToggle = document.createElement('button');
    btnToggle.className = 'btn btn-ghost';
    btnToggle.style.cssText = 'padding:.35rem .7rem;font-size:.8rem;';
    btnToggle.textContent = '⌄';
    btnToggle.addEventListener('click', e => toggleDetalleStock(e, l.id));

    const btnEditar = document.createElement('button');
    btnEditar.className = 'btn btn-ghost';
    btnEditar.style.cssText = 'padding:.35rem .7rem;font-size:.8rem;';
    btnEditar.textContent = '✏ Editar';
    btnEditar.addEventListener('click', () => abrirEdicion(l.id));

    const btnEliminar = document.createElement('button');
    btnEliminar.className = 'btn btn-danger';
    btnEliminar.style.cssText = 'padding:.35rem .7rem;font-size:.8rem;';
    btnEliminar.textContent = '🗑 Eliminar';
    btnEliminar.addEventListener('click', () => eliminarLibro(l.id));

    const tdToggle = document.createElement('td'); tdToggle.style.padding = '0'; tdToggle.appendChild(btnToggle);
    const tdNum = document.createElement('td'); tdNum.style.cssText = 'color:var(--muted);font-size:.8rem;'; tdNum.textContent = i + 1;
    const tdTitulo = document.createElement('td'); tdTitulo.style.fontWeight = '600'; tdTitulo.textContent = l.titulo;
    const tdAutor = document.createElement('td'); tdAutor.textContent = l.autor;
    const tdCat = document.createElement('td');
    const badge = document.createElement('span'); badge.className = 'badge badge-blue'; badge.textContent = l.categoria;
    tdCat.appendChild(badge);
    const tdStock = document.createElement('td'); tdStock.style.cssText = stockColor; tdStock.textContent = l.stock;
    const tdAcciones = document.createElement('td');
    const divAcciones = document.createElement('div'); divAcciones.style.cssText = 'display:flex;gap:.4rem;';
    divAcciones.append(btnEditar, btnEliminar);
    tdAcciones.appendChild(divAcciones);

    tr.append(tdToggle, tdNum, tdTitulo, tdAutor, tdCat, tdStock, tdAcciones);
    tbody.appendChild(tr);

    const detail = document.createElement('tr');
    detail.id = `stock-detail-${l.id}`;
    detail.style.display = 'none';
    const detailCell = document.createElement('td');
    detailCell.colSpan = 7;
    detailCell.style.padding = '0';
    const detailDiv = document.createElement('div');
    detailDiv.style.cssText = 'padding:1rem;background:#f4f8fb;border-top:1px solid #e2e8f0;';
    const tituloDiv = document.createElement('div');
    tituloDiv.style.cssText = 'font-weight:600;margin-bottom:.5rem;';
    tituloDiv.textContent = 'Ejemplares disponibles:';
    detailDiv.appendChild(tituloDiv);
    if (l.isbns.length) {
      const ul = document.createElement('ul');
      ul.style.cssText = 'margin:0 0 0 1rem;padding:0;list-style:disc outside;';
      l.isbns.forEach(isbn => { const li = document.createElement('li'); li.textContent = isbn; ul.appendChild(li); });
      detailDiv.appendChild(ul);
    } else {
      const p = document.createElement('p');
      p.style.cssText = 'margin:0;color:var(--muted);';
      p.textContent = 'No hay ejemplares registrados.';
      detailDiv.appendChild(p);
    }
    detailCell.appendChild(detailDiv);
    detail.appendChild(detailCell);
    tbody.appendChild(detail);
  });

  if (!lista.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7;
    td.style.cssText = 'text-align:center;color:var(--muted);padding:2rem;';
    td.textContent = 'No hay libros que coincidan.';
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

function toggleDetalleStock(event, id) {
  event.stopPropagation();
  const detailRow = document.getElementById(`stock-detail-${id}`);
  if (!detailRow) return;
  detailRow.style.display = detailRow.style.display === 'table-row' ? 'none' : 'table-row';
}

function generarCamposISBN() {
  const cantidadStock = parseInt(document.getElementById('inv-stock').value) || 1;
  const contenedor = document.getElementById('inv-contenedor-isbns');
  contenedor.innerHTML = '';

  for (let i = 1; i <= cantidadStock; i++) {
    const wrapper = document.createElement('div');
    wrapper.style.maxWidth = '300px';
    const label = document.createElement('label');
    label.className = 'form-label';
    label.textContent = `Código / ISBN del Ejemplar ${i} *`;
    const input = document.createElement('input');
    input.className = 'form-input clase-isbn-dinamica';
    input.type = 'text';
    input.placeholder = 'Código o ISBN';
    input.required = true;
    wrapper.append(label, input);
    contenedor.appendChild(wrapper);
  }
}

async function procesarGuardadoLibro() {
  const alertBox = document.getElementById('inv-alert');
  alertBox.style.display = 'none';

  const titulo = document.getElementById('inv-titulo').value.trim();
  const autorCompleto = document.getElementById('inv-autor').value.trim();
  const categoriaNombre = document.getElementById('inv-cat').value;

  const inputsIsbn = document.querySelectorAll('.clase-isbn-dinamica');
  const listaIsbns = [];
  inputsIsbn.forEach(input => {
    if (input.value.trim() !== '') listaIsbns.push(input.value.trim());
  });

  if (!titulo || !autorCompleto) {
    mostrarNotificacion('Por favor, completá el Título y el Autor.', 'warning');
    return;
  }
  if (listaIsbns.length !== inputsIsbn.length) {
    mostrarNotificacion('Por favor, ingresá los códigos o ISBN para todos los ejemplares físicos.', 'warning');
    return;
  }

  let apellido = autorCompleto;
  let nombre = '';
  if (autorCompleto.includes(',')) {
    const partes = autorCompleto.split(',');
    apellido = partes[0].trim();
    nombre = partes[1].trim();
  }

  try {
    let { data: autor } = await supabaseClient
      .from('autores')
      .select('id')
      .eq('apellido', apellido)
      .eq('nombre', nombre)
      .maybeSingle();

    if (!autor) {
      const { data: nuevoAutor, error: errA } = await supabaseClient
        .from('autores')
        .insert([{ apellido, nombre }])
        .select()
        .single();
      if (errA) throw errA;
      autor = nuevoAutor;
    }

    let { data: categoria } = await supabaseClient
      .from('categorias')
      .select('id')
      .eq('nombre', categoriaNombre)
      .maybeSingle();

    if (!categoria) {
      const { data: nuevaCat, error: errC } = await supabaseClient
        .from('categorias')
        .insert([{ nombre: categoriaNombre }])
        .select()
        .single();
      if (errC) throw errC;
      categoria = nuevaCat;
    }

    const urlDrive = document.getElementById('inv-url').value.trim();
    const palabrasClave = document.getElementById('inv-keywords').value.trim();

    const { data: libro, error: errL } = await supabaseClient
      .from('libros')
      .insert([{ titulo, id_autor: autor.id, id_categoria: categoria.id, url_drive: urlDrive, palabras_clave: palabrasClave }])
      .select()
      .single();

    if (errL) throw errL;

    const registrosStock = listaIsbns.map(codigo => ({ id_libro: libro.id, isbn: codigo }));
    const { error: errS } = await supabaseClient.from('stock').insert(registrosStock);
    if (errS) throw errS;

    mostrarNotificacion(`"${titulo}" agregado con éxito junto a sus ${listaIsbns.length} ejemplares.`, 'success');
    alertBox.textContent = `"${titulo}" agregado con éxito junto a sus ${listaIsbns.length} ejemplares físicos!`;
    alertBox.style.display = 'block';
    setTimeout(() => alertBox.style.display = 'none', 3500);

    document.getElementById('inv-titulo').value = '';
    document.getElementById('inv-autor').value = '';
    document.getElementById('inv-stock').value = 1;
    generarCamposISBN();

  } catch (error) {
    console.error(error);
    mostrarNotificacion('Error al guardar en la base de datos: ' + error.message, 'error');
  }
}

function showInvAlert(msg, ok) {
  const el = document.getElementById('inv-alert');
  el.textContent = msg;
  el.className = 'alert ' + (ok ? 'alert-success' : 'alert-error');
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3000);
}

async function eliminarLibro(id) {
  if (!window.confirm('¿Eliminar este libro del inventario? Esta acción no se puede deshacer.')) return;

  const { error } = await supabaseClient
    .from('libros')
    .delete()
    .eq('id', id);

  if (error) {
    mostrarNotificacion('Error al eliminar el libro: ' + error.message, 'error');
    console.error(error);
    return;
  }

  mostrarNotificacion('Libro eliminado del inventario.', 'success');
  await cargarInventario();
  renderInventario();
  populateLibroSelect();
}

function abrirEdicion(id) {
  const l = libros.find(x => x.id === id);
  if (!l) return;
  document.getElementById('edit-id').value = id;
  document.getElementById('edit-titulo').value = l.titulo;
  document.getElementById('edit-autor').value = l.autor;
  document.getElementById('edit-cat').value = l.categoria;
  document.getElementById('edit-stock').value = l.stock;
  document.getElementById('edit-isbn').value = l.isbn || '';
  document.getElementById('edit-url').value = l.url_drive || '';
  document.getElementById('edit-keywords').value = l.palabras_clave || '';
  document.getElementById('modal-edit').style.display = 'flex';
}

async function guardarEdicion() {
  const id = parseInt(document.getElementById('edit-id').value);
  const libro = libros.find(x => x.id === id);
  if (!libro) return;

  const titulo = document.getElementById('edit-titulo').value.trim() || libro.titulo;
  const autorCompleto = document.getElementById('edit-autor').value.trim() || libro.autor;
  const categoriaNombre = document.getElementById('edit-cat').value || libro.categoria;

  let apellido = autorCompleto;
  let nombre = '';
  if (autorCompleto.includes(',')) {
    const partes = autorCompleto.split(',');
    apellido = partes[0].trim();
    nombre = partes[1].trim();
  }

  try {
    let { data: autor } = await supabaseClient
      .from('autores')
      .select('id')
      .eq('apellido', apellido)
      .eq('nombre', nombre)
      .maybeSingle();

    if (!autor) {
      const { data: nuevoAutor, error: errA } = await supabaseClient
        .from('autores')
        .insert([{ apellido, nombre }])
        .select()
        .single();
      if (errA) throw errA;
      autor = nuevoAutor;
    }

    let { data: categoria } = await supabaseClient
      .from('categorias')
      .select('id')
      .eq('nombre', categoriaNombre)
      .maybeSingle();

    if (!categoria) {
      const { data: nuevaCat, error: errC } = await supabaseClient
        .from('categorias')
        .insert([{ nombre: categoriaNombre }])
        .select()
        .single();
      if (errC) throw errC;
      categoria = nuevaCat;
    }

    const urlDrive = document.getElementById('edit-url').value.trim();
    const palabrasClave = document.getElementById('edit-keywords').value.trim();

    const { error: errUpdate } = await supabaseClient
      .from('libros')
      .update({ titulo, id_autor: autor.id, id_categoria: categoria.id, url_drive: urlDrive, palabras_clave: palabrasClave })
      .eq('id', id);

    if (errUpdate) throw errUpdate;

    mostrarNotificacion('Libro actualizado correctamente.', 'success');
    await cargarInventario();
    renderInventario();
    populateLibroSelect();
    document.getElementById('modal-edit').style.display = 'none';
  } catch (error) {
    console.error(error);
    mostrarNotificacion('Error al actualizar el libro: ' + error.message, 'error');
  }
}

function closeModal(e) {
  if (e.target === document.getElementById('modal-edit'))
    document.getElementById('modal-edit').style.display = 'none';
}
