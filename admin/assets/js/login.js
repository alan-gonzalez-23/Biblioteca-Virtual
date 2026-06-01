/* ============================================================
   AUTH — Login via Supabase Auth
   Las credenciales se validan del lado del servidor (Supabase).
   ============================================================ */

async function iniciarSesion(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  const errEl = document.getElementById('login-error');
  if (error) {
    if (errEl) { errEl.textContent = 'Credenciales incorrectas. Intentá de nuevo.'; errEl.style.display = 'block'; }
    console.error('Error al iniciar sesión:', error.message);
  } else {
    if (errEl) errEl.style.display = 'none';
    window.location.href = './index.html';
  }
}


function doLogin() {
  const u = document.getElementById('usr').value.trim();
  const p = document.getElementById('pwd').value;
  iniciarSesion(u,p);
}

// FUNCIÓN PARA PROTEGER EL ACCESO A LAS PÁGINAS ADMINISTRATIVAS


// Ejecutar la verificación inmediatamente cuando el navegador empiece a procesar la página




document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (document.getElementById('login-screen').style.display !== 'none') doLogin();
  }
});

async function doLogout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}