// IMPORTANTE: Estas claves son públicas (anon key de Supabase).
// La seguridad real se gestiona con Row Level Security (RLS) en el panel de Supabase.
// NUNCA uses la service_role key en el frontend.

const SUPABASE_URL = window.SUPABASE_URL || 'https://slchfmaokehnxiqvtaxl.supabase.co';
const SUPABASE_KEY = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsY2hmbWFva2VobnhpcXZ0YXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MzExNTMsImV4cCI6MjA5NTUwNzE1M30.EcW_8sBhQpJYFgVzBwYLudBL90bqy6Ix5awe82Ne8mw'; // Reemplazá con tu anon key real

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function verificarAccesoProtegido() {
  const path = window.location.pathname;
  const esPaginaLogin = path.includes('login.html');
  const esPaginaAdmin = path.includes('/admin/') || path.includes('admin/index.html') || path.includes('admin\\');

  // No bloquear las páginas públicas (como index.html)
  if (!esPaginaAdmin && !esPaginaLogin) {
    return;
  }

  // 1. DECLARACIÓN ÚNICA: Le preguntamos a Supabase por la sesión (Línea 14)
  const { data: { session }, error } = await supabaseClient.auth.getSession();

  // 2. Si ya inició sesión e intenta ir al login, la redirigimos al panel
  if (session && esPaginaLogin) {
    console.log("🔄 Sesión activa detectada en página de login. Redirigiendo al panel...");
    window.location.href = './index.html';
    return;
  }

  if (!session || error) {
    if (esPaginaAdmin) {
      console.warn("⚠️ Acceso no autorizado. Redirigiendo al login...");
      window.location.href = 'login.html';
    }
  } else {
    // Si la sesión es válida y está en la interfaz de administración, mostramos la barra lateral
    console.log("✅ Sesión activa verificada para:", session.user.email);
    const contenedor = document.getElementById('app');
    if (contenedor) {
      contenedor.style.display = 'block';
    }
    renderSidebarProfile(session.user);
    ejecutarPruebaConexion();
  }
}

function renderSidebarProfile(user) {
  if (!user) return;
  const email = user.email || '';
  const avatar = email ? email.split('@')[0].slice(0, 2).toUpperCase() : 'BI';
  const nameEl = document.getElementById('sidebar-user-name');
  const emailEl = document.getElementById('sidebar-user-email');
  const avatarEl = document.getElementById('sidebar-user-avatar');

  if (nameEl) nameEl.textContent = 'Bibliotecaria';
  if (emailEl) emailEl.textContent = email;
  if (avatarEl) avatarEl.textContent = avatar;
}


async function ejecutarPruebaConexion() {
  const { data, error } = await supabaseClient.from('libros').select('id').limit(1);
  if (error) {
    console.error('❌ Error de conexión a Supabase:', error.message);
  } else {
    console.log('✅ ¡Conexión exitosa a la base de datos del colegio!');
  }
}

// Inicializar el guardián de inmediato
verificarAccesoProtegido();

/* ===== RESPONSIVE MENU ===== */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
      menuBtn.textContent = sidebar.classList.contains('open') ? '✕' : '☰';
    }
  }
}

// Cerrar sidebar al hacer clic en nav items o fuera del sidebar
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('menu-btn');
  
  if (!sidebar || !menuBtn) return;
  
  const isClickInsideSidebar = sidebar.contains(e.target);
  const isClickOnMenuBtn = menuBtn.contains(e.target);
  
  if (!isClickInsideSidebar && !isClickOnMenuBtn && sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
    menuBtn.textContent = '☰';
  }
});

// Cerrar sidebar al hacer clic en un nav-item
document.addEventListener('DOMContentLoaded', () => {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      const menuBtn = document.getElementById('menu-btn');
      
      if (window.innerWidth <= 768 && sidebar && menuBtn) {
        sidebar.classList.remove('open');
        menuBtn.textContent = '☰';
      }
    });
  });
});

// Cerrar sidebar al cambiar orientación o redimensionar
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menu-btn');
    
    if (sidebar && menuBtn) {
      sidebar.classList.remove('open');
      menuBtn.textContent = '☰';
    }
  }
});
