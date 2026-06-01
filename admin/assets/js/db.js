// IMPORTANTE: Estas claves son públicas (anon key de Supabase).
// La seguridad real se gestiona con Row Level Security (RLS) en el panel de Supabase.
// NUNCA uses la service_role key en el frontend.

const SUPABASE_URL = 'https://slchfmaokehnxiqvtaxl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsY2hmbWFva2VobnhpcXZ0YXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MzExNTMsImV4cCI6MjA5NTUwNzE1M30.EcW_8sBhQpJYFgVzBwYLudBL90bqy6Ix5awe82Ne8mw'; // Reemplazá con tu anon key real

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function verificarAccesoProtegido() {
  const esPaginaLogin = window.location.pathname.includes('login.html');

  // 1. DECLARACIÓN ÚNICA: Le preguntamos a Supabase por la sesión (Línea 14)
  const { data: { session }, error } = await supabaseClient.auth.getSession();

  // 2. Si ya inició sesión e intenta ir al login, la redirigimos al panel
  if (session && esPaginaLogin) {
    console.log("🔄 Sesión activa detectada en página de login. Redirigiendo al panel...");
    window.location.href = './index.html';
    return;
  }

  // 3. CORREGIDO: Usamos la variable 'session' sin volver a poner la palabra "const"
  if (!session || error) {
    if (!esPaginaLogin) {
      console.warn("⚠️ Acceso no autorizado. Redirigiendo al login...");
      window.location.href = 'login.html';
    }
  } else {
    // Si la sesión es válida y está en el panel, mostramos la interfaz
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
