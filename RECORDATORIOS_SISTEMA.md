# Sistema de Recordatorios de Préstamos - Documentación Técnica

## 📋 Resumen General

El sistema de recordatorios permite a la bibliotecaria enviar correos electrónicos a los alumnos para recordarles que devuelvan los libros prestados. Los mails se envían **de forma manual** al hacer clic en el botón "📧 Enviar recordatorios" en la sección "Gestión de Préstamos".

---

## 🔧 Componentes del Sistema

### 1. **Frontend - HTML (admin/index.html)**

```html
<button id="btn-recordatorios" class="btn btn-primary" style="display:none;" onclick="enviarRecordatorios()">
  📧 Enviar recordatorios
</button>
```

**Características:**
- El botón se **oculta automáticamente** si no hay préstamos pendientes con email
- Solo es visible cuando existen préstamos activos o vencidos que tengan email registrado
- Al hacer clic, ejecuta la función `enviarRecordatorios()`

---

### 2. **Backend - Lógica en JavaScript (admin/assets/js/prestamos.js)**

#### **2.1 Configuración de EmailJS**

```javascript
const EMAILJS_SERVICE  = 'service_bytd01h';      // Identificador del servicio
const EMAILJS_TEMPLATE = 'template_899iqtk';     // Plantilla del email
const EMAILJS_KEY      = '1Uu73DKwGR4ADExX9';    // Clave de autenticación
```

**EmailJS** es un servicio que permite enviar correos desde JavaScript sin necesidad de un backend tradicional.

---

#### **2.2 Función `renderLoans()` - Control de Visibilidad del Botón**

```javascript
function renderLoans() {
  // ... código de filtrado y ordenamiento ...
  
  // Botón recordatorios: mostrar solo si hay préstamos activos/vencidos con email
  const conEmail = lista.filter(p => p.estado !== 'devuelto' && p.email && p.email !== '—');
  const btnRecordatorio = document.getElementById('btn-recordatorios');
  if (btnRecordatorio) btnRecordatorio.style.display = conEmail.length ? 'inline-flex' : 'none';
}
```

**¿Qué hace?**
- Filtra los préstamos mostrados en pantalla
- Busca aquellos que **NO están devueltos** (`estado !== 'devuelto'`)
- Y que **tienen email válido** (`p.email && p.email !== '—'`)
- Si encuentra al menos uno, **muestra el botón**
- Si no encuentra ninguno, **oculta el botón**

---

#### **2.3 Función `marcarDevuelto(id)` - Marcar un Préstamo como Devuelto**

```javascript
async function marcarDevuelto(id) {
  const { error } = await supabaseClient
    .from('prestamos')
    .update({ estado: 'devuelto' })
    .eq('id', id);

  if (error) {
    mostrarNotificacion('Error al marcar el préstamo como devuelto: ' + error.message, 'error');
    return;
  }

  await cargarPrestamos();      // Recarga los préstamos desde la BD
  renderLoans();                // Re-renderiza la lista
  if (typeof renderStats === 'function') renderStats(); // Actualiza estadísticas
  mostrarNotificacion('✔ Préstamo marcado como devuelto', 'success');
}
```

**¿Qué hace?**
- Actualiza el estado del préstamo a `'devuelto'` en la base de datos
- Recarga la lista de préstamos
- Re-renderiza la pantalla
- **NO envía emails automáticamente** (este era el bug)
- Solo muestra un mensaje de confirmación

---

#### **2.4 Función `enviarRecordatorios()` - Envío Manual de Recordatorios**

Esta es la función principal que hace el envío de mails:

```javascript
async function enviarRecordatorios() {
  emailjs.init(EMAILJS_KEY);  // Inicializa EmailJS con la clave API

  const hoy = new Date();
  
  // PASO 1: Filtrar solo los préstamos pendientes
  const pendientes = prestamos.filter(p =>
    p.estado !== 'devuelto' &&  // No devueltos
    p.email &&                  // Tienen email
    p.email !== '—'            // Email válido
  );
  
  // Si no hay pendientes, mostrar mensaje
  if (!pendientes.length) {
    mostrarNotificacion('⚠ No hay préstamos pendientes para recordar', 'warning');
    return;
  }

  // PASO 2: Agrupar por usuario (para no enviar múltiples mails al mismo alumno)
  const porUsuario = {};
  pendientes.forEach(p => {
    if (!porUsuario[p.email]) {
      porUsuario[p.email] = [];  // Crear array de préstamos por email
    }
    porUsuario[p.email].push(p);
  });

  // PASO 3: Enviar un email por usuario
  let enviados = 0;
  for (const email in porUsuario) {
    const prestamosDel = porUsuario[email];
    const primerPrestamo = prestamosDel[0];
    
    // Calcular días restantes
    const diasRestantes = Math.ceil(
      (new Date(primerPrestamo.fechaDevolucion) - hoy) / 86400000
    );
    
    // Determinar el estado
    const estadoTexto = diasRestantes < 0
      ? `VENCIDO hace ${Math.abs(diasRestantes)} día(s)`
      : `vence en ${diasRestantes} día(s) (${formatDate(primerPrestamo.fechaDevolucion)})`;

    // Crear lista formateada de libros
    const librosLista = prestamosDel.map(p => {
      const diasLibro = Math.ceil((new Date(p.fechaDevolucion) - hoy) / 86400000);
      const estadoLibro = diasLibro < 0 ? 'VENCIDO' : 'Pendiente';
      return `• ${p.libro} (${estadoLibro})`;
    }).join('\n');

    // PASO 4: Enviar email
    try {
      await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
        to_email:  email,
        to_name:   primerPrestamo.nombre,
        libro:     librosLista,           // Lista de libros
        estado:    estadoTexto,           // Estado del préstamo
      });
      enviados++;
    } catch (error) {
      console.error(`Error enviando email a ${email}:`, error);
    }
  }

  // PASO 5: Mostrar confirmación
  mostrarNotificacion(`✅ Recordatorios enviados a ${enviados} alumno(s)`, 'success');
}
```

---

## 🔄 Flujo de Datos Completo

### **Escenario: Enviar Recordatorios**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Bibliotecaria abre "Gestión de Préstamos"                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Se carga cargarPrestamos()                               │
│    - Obtiene datos de: préstamos, usuarios, libros, stock   │
│    - Crea array `prestamos` en memoria                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Se ejecuta renderLoans()                                 │
│    - Filtra préstamos según búsqueda/filtro                │
│    - Busca préstamos sin devolver con email                │
│    - Si hay: muestra botón "📧 Enviar recordatorios"       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Bibliotecaria ve el botón y hace clic                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Se ejecuta enviarRecordatorios()                         │
│    a) Filtra nuevamente los préstamos pendientes            │
│    b) Los agrupa por email del alumno                       │
│    c) Para cada alumno:                                     │
│       - Calcula días restantes                              │
│       - Crea lista de libros                                │
│       - Envía email vía EmailJS                             │
│    d) Muestra confirmación                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🐛 El Bug Que Fue Corregido

### **Antes (Problema):**

```javascript
async function marcarDevuelto(id) {
  const { error } = await supabaseClient
    .from('prestamos')
    .update({ estado: 'devuelto' })
    .eq('id', id);

  if (error) { /* ... */ return; }

  await cargarPrestamos();
  renderLoans();
  if (typeof renderStats === 'function') renderStats();
  
  // ❌ PROBLEMA: Esto enviaba emails automáticamente
  await enviarRecordatorios();  // ← ELIMINADO
}
```

**¿Qué pasaba?**
- Cuando se marcaba un préstamo como devuelto, se ejecutaba `enviarRecordatorios()` automáticamente
- Esto podía generar emails a alumnos incluso cuando no se deseaba
- Especialmente confuso si se marcaban varios préstamos seguidos

---

### **Después (Solución):**

```javascript
async function marcarDevuelto(id) {
  const { error } = await supabaseClient
    .from('prestamos')
    .update({ estado: 'devuelto' })
    .eq('id', id);

  if (error) { /* ... */ return; }

  await cargarPrestamos();
  renderLoans();
  if (typeof renderStats === 'function') renderStats();
  
  // ✅ SOLUCIÓN: Solo muestra confirmación
  mostrarNotificacion('✔ Préstamo marcado como devuelto', 'success');
}
```

**¿Qué sucede ahora?**
- Al marcar como devuelto: solo marca y actualiza la pantalla
- El botón de recordatorios se ocultará automáticamente si ya no hay más pendientes
- Los emails solo se envían al hacer clic explícitamente en "📧 Enviar recordatorios"

---

## 📊 Filtrado Inteligente del Botón

El botón "Enviar recordatorios" se **muestra/oculta dinámicamente** según:

| Condición | Resultado |
|-----------|-----------|
| Hay préstamos activos/vencidos con email | ✅ Botón VISIBLE |
| Todos los préstamos están devueltos | ❌ Botón OCULTO |
| No hay emails registrados | ❌ Botón OCULTO |
| Se aplica un filtro (ej: "Devuelto") | ❌ Botón OCULTO |
| Hay búsqueda activa sin resultados | ❌ Botón OCULTO |

---

## 🚀 Mejoras Implementadas

### 1. **Agrupación por Usuario**
Antes se enviaba un email por cada préstamo. Ahora:
- Se agrupan todos los préstamos de un alumno
- Se envía UN SOLO EMAIL con la lista de libros
- Más eficiente y menos spam

### 2. **Mejor Información en el Email**
El email ahora incluye:
- Nombre del alumno
- **Lista de todos sus libros** (no solo uno)
- Estado de cada libro (Pendiente o VENCIDO)
- Fecha exacta de vencimiento

### 3. **Mensajes de Validación**
- Si hay 0 préstamos pendientes: muestra aviso
- Confirma cantidad de alumnos notificados
- Manejo de errores en EmailJS

---

## 📧 Plantilla de Email en EmailJS

Los campos enviados a la plantilla son:

```javascript
{
  to_email:  "alumno@gmail.com",
  to_name:   "Juan Pérez",
  libro:     "• El Quijote (Pendiente)\n• 1984 (VENCIDO)",
  estado:    "VENCIDO hace 3 día(s)"
}
```

La plantilla debe tener variables:
- `{{to_name}}` - Nombre del alumno
- `{{libro}}` - Lista de libros
- `{{estado}}` - Estado del préstamo

---

## 🔐 Seguridad

⚠️ **Importante:** Las credenciales de EmailJS están en el código frontend:
```javascript
const EMAILJS_KEY = '1Uu73DKwGR4ADExX9';
```

**Consideraciones:**
- Esta clave es pública (está en el navegador)
- EmailJS limita por dominio origen
- Se recomienda configurar restricciones en el dashboard de EmailJS
- Para producción, considerar usar un backend

---

## 🧪 Casos de Uso

### **Caso 1: Recordatorio Simple**
1. Bibliotecaria ve préstamo activo que vence en 3 días
2. Hace clic en "📧 Enviar recordatorios"
3. Se envía email al alumno

### **Caso 2: Múltiples Alumnos**
1. Hay 5 alumnos con préstamos vencidos
2. Se hace clic una vez en "📧 Enviar recordatorios"
3. Se envían 5 emails (uno por alumno, agrupado)

### **Caso 3: Alumno con Múltiples Libros**
1. Un alumno tiene 3 libros prestados
2. Se hace clic en "📧 Enviar recordatorios"
3. Se envía UN email con los 3 libros listados

### **Caso 4: Después de Marcar Devolución**
1. Todos los préstamos estaban vencidos
2. Bibliotecaria marca uno como devuelto
3. Si aún hay pendientes: botón se mantiene visible
4. Si eran los últimos: botón se oculta automáticamente

---

## ✨ Conclusión

El sistema ahora funciona correctamente:
- ✅ Envío manual (no automático)
- ✅ Agrupado por usuario
- ✅ Control visual del botón
- ✅ Mejor información en emails
- ✅ Manejo de errores
