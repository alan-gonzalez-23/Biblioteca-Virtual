/* ── SUPABASE ───────────────────────────────────── */
const SUPABASE_URL = 'https://slchfmaokehnxiqvtaxl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsY2hmbWFva2VobnhpcXZ0YXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MzExNTMsImV4cCI6MjA5NTUwNzE1M30.EcW_8sBhQpJYFgVzBwYLudBL90bqy6Ix5awe82Ne8mw';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ── ESTADO ─────────────────────────────────────── */
let librosPublicos = [];
let categoriasPublicas = [];

const CAT_EMOJIS = { Ciencias:'🔭', Literatura:'📖', Informática:'💻', Historia:'🏛', Matemáticas:'📐' };
const FALLBACK_COLORS = ['#2563eb','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80';

/* ── INIT ───────────────────────────────────────── */
async function initPublic() {
  await Promise.all([cargarLibrosPublicos(), cargarCategoriasPublicas()]);
  renderBooks();
  buildCarousel();
  await cargarEstadisticas();
}

/* ── CARGA DE DATOS ─────────────────────────────── */
async function cargarLibrosPublicos() {
  const { data: librosData, error: errLibros } = await sb
    .from('libros')
    .select('id,titulo,url_drive,palabras_clave,autores(nombre,apellido),categorias(nombre)')
    .order('titulo', { ascending: true });

  if (errLibros) { console.error('Error cargando libros:', errLibros.message); return; }

  const { data: stockData } = await sb.from('stock').select('id_libro');
  const stockCount = (stockData || []).reduce((acc, s) => {
    acc[s.id_libro] = (acc[s.id_libro] || 0) + 1; return acc;
  }, {});

  const { data: prestadosData } = await sb
    .from('prestamos')
    .select('id_stock,stock(id_libro)')
    .neq('estado', 'devuelto');
  const prestadosCount = (prestadosData || []).reduce((acc, p) => {
    const idLibro = p.stock?.id_libro;
    if (idLibro) acc[idLibro] = (acc[idLibro] || 0) + 1;
    return acc;
  }, {});

  librosPublicos = (librosData || []).map(b => {
    const total = stockCount[b.id] || 0;
    const prestados = prestadosCount[b.id] || 0;
    return {
      id: b.id,
      titulo: b.titulo,
      autor: b.autores ? `${b.autores.apellido}, ${b.autores.nombre}` : '—',
      categoria: b.categorias?.nombre || '—',
      stock: Math.max(0, total - prestados),
      pdfUrl: b.url_drive || null,
    };
  });
}

async function cargarCategoriasPublicas() {
  const { data, error } = await sb.from('categorias').select('id,nombre,descripcion,color,imagen_url');
  if (error) { console.error('Error cargando categorías:', error.message); return; }

  const { data: librosData } = await sb.from('libros').select('id_categoria');
  const counts = (librosData || []).reduce((acc, l) => {
    acc[l.id_categoria] = (acc[l.id_categoria] || 0) + 1; return acc;
  }, {});

  categoriasPublicas = (data || []).map((c, idx) => ({
    id: c.id,
    name: c.nombre,
    books: counts[c.id] || 0,
    desc: c.descripcion || '',
    hex: c.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
    img: c.imagen_url || FALLBACK_IMG,
  })).filter(c => c.books > 0);
}

async function cargarEstadisticas() {
  const [
    { count: totalLibros },
    { count: totalUsuarios },
    { count: totalPrestamos },
    { count: devueltos },
    { count: totalCategorias },
  ] = await Promise.all([
    sb.from('stock').select('*', { count: 'exact', head: true }),
    sb.from('usuarios').select('*', { count: 'exact', head: true }),
    sb.from('prestamos').select('*', { count: 'exact', head: true }),
    sb.from('prestamos').select('*', { count: 'exact', head: true }).eq('estado', 'devuelto'),
    sb.from('categorias').select('*', { count: 'exact', head: true }),
  ]);

  const pct = totalPrestamos ? Math.round((devueltos / totalPrestamos) * 100) : 0;

  animarNumero('stat-libros', totalLibros || 0);
  animarNumero('stat-usuarios', totalUsuarios || 0);
  setStatText('stat-devolucion', `${pct}%`);
  animarNumero('stat-categorias', totalCategorias || 0);
}

function animarNumero(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 1200;
  const start = performance.now();
  const update = now => {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(ease * target).toLocaleString('es-AR');
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function setStatText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* ── NAVBAR scroll ──────────────────────────────── */
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
});

/* ── HAMBURGER ──────────────────────────────────── */
function toggleMenu() {
  const menu = document.getElementById('mobile-menu');
  const btn = document.getElementById('hamburger-btn');
  const open = menu.classList.toggle('open');
  btn.setAttribute('aria-expanded', open);
  btn.textContent = open ? '✕' : '☰';
}
document.addEventListener('click', e => {
  const menu = document.getElementById('mobile-menu');
  if (!menu.contains(e.target) && !document.getElementById('hamburger-btn').contains(e.target)) {
    menu.classList.remove('open');
    document.getElementById('hamburger-btn').setAttribute('aria-expanded', false);
    document.getElementById('hamburger-btn').textContent = '☰';
  }
});

/* ── SEARCH ─────────────────────────────────────── */
function doSearch(q) {
  const container = document.getElementById('search-results');
  const term = q.toLowerCase().trim();

  if (!term) { container.style.display = 'none'; container.innerHTML = ''; return; }

  const results = librosPublicos.filter(b =>
    b.titulo.toLowerCase().includes(term) ||
    b.autor.toLowerCase().includes(term) ||
    b.categoria.toLowerCase().includes(term)
  );

  container.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'sr-header';

  if (!results.length) {
    header.textContent = 'Sin resultados';
    const msg = document.createElement('div');
    msg.className = 'sr-item';
    msg.style.cssText = 'color:var(--muted);font-size:.875rem;';
    msg.textContent = `No encontramos libros para "${q}". Probá otro término.`;
    container.append(header, msg);
  } else {
    header.textContent = `${results.length} resultado${results.length > 1 ? 's' : ''} para "${q}"`;
    container.appendChild(header);
    results.forEach(b => {
      const item = document.createElement('div');
      item.className = 'sr-item';
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', `Ver ${b.titulo}`);
      if (b.pdfUrl) {
        item.addEventListener('click', () => window.open(b.pdfUrl, '_blank'));
        item.addEventListener('keydown', e => { if (e.key === 'Enter') window.open(b.pdfUrl, '_blank'); });
        item.style.cursor = 'pointer';
      } else {
        item.style.cursor = 'default';
      }

      const emoji = CAT_EMOJIS[b.categoria] || '📚';
      const cover = document.createElement('div'); cover.className = 'sr-cover'; cover.textContent = emoji;
      const info = document.createElement('div');
      const title = document.createElement('div'); title.className = 'sr-title'; title.textContent = b.titulo;
      const meta = document.createElement('div'); meta.className = 'sr-meta';
      meta.textContent = `${b.autor} · ${b.stock > 0 ? `${b.stock} disponible${b.stock !== 1 ? 's' : ''}` : 'Sin stock'}`;
      info.append(title, meta);
      const badge = document.createElement('span');
      badge.className = 'badge-pill badge-blue sr-badge';
      badge.textContent = b.categoria;

      item.append(cover, info, badge);
      container.appendChild(item);
    });
  }
  container.style.display = 'block';
}

/* ── CATÁLOGO COMPLETO ───────────────────────────── */
const POR_PAGINA = 12;
let paginaActual = 1;
let librosFiltrados = [];

function poblarFiltrosCatalogo() {
  const sel = document.getElementById('catalogo-cat');
  if (!sel) return;
  sel.innerHTML = '<option value="">Todas las categorías</option>';
  categoriasPublicas.forEach(c => {
    const o = document.createElement('option');
    o.value = c.name; o.textContent = c.name;
    sel.appendChild(o);
  });
}

function filtrarCatalogo() {
  const q = (document.getElementById('catalogo-input')?.value || '').toLowerCase().trim();
  const cat = document.getElementById('catalogo-cat')?.value || '';
  const stock = document.getElementById('catalogo-stock')?.value || '';

  librosFiltrados = librosPublicos.filter(b => {
    const matchQ = !q ||
      b.titulo.toLowerCase().includes(q) ||
      b.autor.toLowerCase().includes(q) ||
      (b.palabras_clave || '').toLowerCase().includes(q) ||
      b.categoria.toLowerCase().includes(q);
    const matchCat = !cat || b.categoria === cat;
    const matchStock = !stock ||
      (stock === 'disponible' && b.stock > 0) ||
      (stock === 'sin' && b.stock === 0);
    return matchQ && matchCat && matchStock;
  });

  paginaActual = 1;
  renderCatalogo();
}

function renderCatalogo() {
  const grid = document.getElementById('books-grid');
  const paginacion = document.getElementById('catalogo-paginacion');
  const countEl = document.getElementById('catalogo-count');
  grid.innerHTML = '';
  paginacion.innerHTML = '';

  const total = librosFiltrados.length;
  if (countEl) countEl.textContent = `${total} libro${total !== 1 ? 's' : ''}`;

  if (!total) {
    const msg = document.createElement('p');
    msg.style.cssText = 'color:var(--muted);text-align:center;padding:3rem;grid-column:1/-1;';
    msg.textContent = 'No hay libros que coincidan con la búsqueda.';
    grid.appendChild(msg);
    return;
  }

  const totalPags = Math.ceil(total / POR_PAGINA);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const pagina = librosFiltrados.slice(inicio, inicio + POR_PAGINA);

  pagina.forEach(b => {
    const catData = categoriasPublicas.find(c => c.name === b.categoria);
    const color = catData?.hex || '#94a3b8';
    const emoji = CAT_EMOJIS[b.categoria] || '📚';

    const card = document.createElement('div');
    card.className = 'book-card' + (!b.pdfUrl ? ' book-card-sin-pdf' : '');

    const cover = document.createElement('div');
    cover.className = 'book-cover';
    cover.style.background = `linear-gradient(135deg,${color}22,${color}44)`;
    const emojiEl = document.createElement('span'); emojiEl.style.fontSize = '3.5rem'; emojiEl.textContent = emoji;
    const pill = document.createElement('span'); pill.className = 'book-cat-pill'; pill.textContent = b.categoria;
    cover.append(emojiEl, pill);

    const body = document.createElement('div'); body.className = 'book-body';
    const titleEl = document.createElement('div'); titleEl.className = 'book-title'; titleEl.textContent = b.titulo;
    const authorEl = document.createElement('div'); authorEl.className = 'book-author'; authorEl.textContent = b.autor;

    const footer = document.createElement('div'); footer.className = 'book-footer';
    const stockEl = document.createElement('span');
    stockEl.className = 'book-stock' + (b.stock === 0 ? ' low' : '');
    stockEl.textContent = b.stock > 0 ? `✔ ${b.stock} disponible${b.stock !== 1 ? 's' : ''}` : '✘ Sin stock';
    footer.appendChild(stockEl);

    if (b.pdfUrl) {
      const link = document.createElement('a');
      link.className = 'btn-pdf';
      link.href = b.pdfUrl; link.target = '_blank'; link.rel = 'noopener';
      link.textContent = '📚 Ver PDF';
      footer.appendChild(link);
    } else {
      const noLink = document.createElement('span');
      noLink.className = 'sin-pdf-badge';
      noLink.textContent = 'Solo físico';
      footer.appendChild(noLink);
    }

    body.append(titleEl, authorEl, footer);
    card.append(cover, body);
    grid.appendChild(card);
  });

  // Paginación
  if (totalPags <= 1) return;

  const btnPrev = document.createElement('button');
  btnPrev.className = 'pag-btn'; btnPrev.textContent = '←';
  btnPrev.disabled = paginaActual === 1;
  btnPrev.addEventListener('click', () => { paginaActual--; renderCatalogo(); window.scrollTo({ top: document.getElementById('destacados').offsetTop - 80, behavior: 'smooth' }); });
  paginacion.appendChild(btnPrev);

  for (let i = 1; i <= totalPags; i++) {
    const btn = document.createElement('button');
    btn.className = 'pag-btn' + (i === paginaActual ? ' active' : '');
    btn.textContent = i;
    btn.addEventListener('click', () => { paginaActual = i; renderCatalogo(); window.scrollTo({ top: document.getElementById('destacados').offsetTop - 80, behavior: 'smooth' }); });
    paginacion.appendChild(btn);
  }

  const btnNext = document.createElement('button');
  btnNext.className = 'pag-btn'; btnNext.textContent = '→';
  btnNext.disabled = paginaActual === totalPags;
  btnNext.addEventListener('click', () => { paginaActual++; renderCatalogo(); window.scrollTo({ top: document.getElementById('destacados').offsetTop - 80, behavior: 'smooth' }); });
  paginacion.appendChild(btnNext);
}

function renderBooks() {
  librosFiltrados = [...librosPublicos];
  poblarFiltrosCatalogo();
  renderCatalogo();
}

/* ── CAROUSEL ───────────────────────────────────── */
let currentCat = 0;

function getPosition(catIdx, activeIdx) {
  const n = categoriasPublicas.length;
  let diff = (catIdx - activeIdx + n) % n;
  if (diff > 2) diff -= n;
  return { '-2':'left2', '-1':'left1', '0':'center', '1':'right1', '2':'right2' }[diff] || null;
}

function buildCarousel() {
  const track = document.getElementById('carousel-track');
  const dots = document.getElementById('carousel-dots');
  track.innerHTML = '';
  dots.innerHTML = '';

  if (!categoriasPublicas.length) return;

  categoriasPublicas.forEach((cat, i) => {
    const card = document.createElement('div');
    card.className = 'cat-card';
    card.setAttribute('role', 'tabpanel');
    card.setAttribute('aria-label', cat.name);
    card.dataset.idx = i;

    const img = document.createElement('img');
    img.src = cat.img || ''; img.alt = `Categoría ${cat.name}`; img.loading = 'lazy';
    const overlay = document.createElement('div'); overlay.className = 'cat-overlay';
    const topBar = document.createElement('div'); topBar.className = 'cat-top-bar'; topBar.style.background = cat.hex;
    const content = document.createElement('div'); content.className = 'cat-content';
    const labelEl = document.createElement('div'); labelEl.className = 'cat-label'; labelEl.style.color = cat.hex;
    labelEl.textContent = `${cat.books} LIBRO${cat.books !== 1 ? 'S' : ''}`;
    const titleEl = document.createElement('div'); titleEl.className = 'cat-title'; titleEl.textContent = cat.name;
    const descEl = document.createElement('div'); descEl.className = 'cat-desc'; descEl.textContent = cat.desc || '';
    content.append(labelEl, titleEl, descEl);
    card.append(img, overlay, topBar, content);

    card.addEventListener('click', () => { currentCat = i; updateCarousel(); });
    card.addEventListener('keydown', e => { if (e.key === 'Enter') { currentCat = i; updateCarousel(); } });
    track.appendChild(card);

    const dot = document.createElement('div');
    dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('role', 'tab'); dot.setAttribute('aria-label', cat.name); dot.setAttribute('tabindex', '0');
    dot.addEventListener('click', () => { currentCat = i; updateCarousel(); });
    dot.addEventListener('keydown', e => { if (e.key === 'Enter') { currentCat = i; updateCarousel(); } });
    dots.appendChild(dot);
  });

  updateCarousel();
}

function updateCarousel() {
  document.querySelectorAll('.cat-card').forEach((card, i) => {
    const pos = getPosition(i, currentCat);
    card.dataset.pos = pos || 'hidden';
    card.style.display = pos ? '' : 'none';
    card.setAttribute('aria-selected', pos === 'center');
    card.setAttribute('tabindex', pos === 'center' ? '0' : '-1');
  });
  document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === currentCat);
    dot.setAttribute('aria-selected', i === currentCat);
  });
}

function carouselNext() { currentCat = (currentCat + 1) % categoriasPublicas.length; updateCarousel(); }
function carouselPrev() { currentCat = (currentCat - 1 + categoriasPublicas.length) % categoriasPublicas.length; updateCarousel(); }

document.addEventListener('keydown', e => {
  if (['ArrowLeft','ArrowRight'].includes(e.key) && document.activeElement.classList.contains('cat-card')) {
    e.key === 'ArrowRight' ? carouselNext() : carouselPrev();
  }
});

setInterval(() => { if (!document.hidden && categoriasPublicas.length) carouselNext(); }, 4500);

/* ── ARRANCAR ───────────────────────────────────── */
initPublic();
