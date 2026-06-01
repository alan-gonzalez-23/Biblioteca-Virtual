/* ============================================================
ESTADÍSTICAS DINÁMICAS
   ============================================================ */
const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function renderStats() {
  const totalPrestamos = prestamos.length;
  const uniqueStudents = new Set(prestamos.filter(p => p.dni && p.dni !== '—').map(p => p.dni)).size;
  const returnedCount = prestamos.filter(p => p.estado === 'devuelto').length;
  const onTimeRate = totalPrestamos ? Math.round((returnedCount / totalPrestamos) * 100) : 0;

  const categoryCounts = prestamos.reduce((acc, p) => {
    if (!p.libroId) return acc;
    const libro = libros.find(l => l.id === p.libroId);
    const cat = libro?.categoria || 'Sin categoría';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const topCategory = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category)[0] || 'Sin datos';

  updateStatCard('stat-total-loans', totalPrestamos);
  updateStatCard('stat-top-category', topCategory);
  updateStatCard('stat-on-time', `${onTimeRate}%`);
  updateStatCard('stat-active-students', uniqueStudents);

  buildChart();
}

function updateStatCard(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function buildChart() {
  const wrap = document.getElementById('chart-bars');
  if (!wrap) return;

  wrap.innerHTML = '';
  const chartData = getMonthlyLoanChartData(6);
  if (!chartData.length) {
    wrap.innerHTML = '<p style="color:var(--muted);padding:2rem;text-align:center;">No hay datos de préstamos para mostrar.</p>';
    return;
  }

  const maxValue = Math.max(...chartData.map(d => d.count), 1);

  chartData.forEach(d => {
    const isTop = d.count === maxValue;
    const col = document.createElement('div');
    col.className = 'bar-col';
    const height = Math.round((d.count / maxValue) * 140) + 20;

    const valSpan = document.createElement('span');
    valSpan.className = 'bar-val';
    valSpan.textContent = d.count;

    const bar = document.createElement('div');
    bar.className = 'bar' + (isTop ? ' highlight' : '');
    bar.style.height = height + 'px';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'bar-label';
    labelSpan.textContent = d.month;

    bar.appendChild(labelSpan);
    col.append(valSpan, bar);
    wrap.appendChild(col);
  });
}

function getMonthlyLoanChartData(limit = 6) {
  const months = {};

  prestamos.forEach(p => {
    if (!p.fechaPrestamo) return;
    const date = new Date(p.fechaPrestamo);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    months[key] = (months[key] || 0) + 1;
  });

  const allKeys = Object.keys(months).sort((a, b) => {
    const [ya, ma] = a.split('-').map(Number);
    const [yb, mb] = b.split('-').map(Number);
    return ya === yb ? ma - mb : ya - yb;
  });

  if (!allKeys.length) return [];

  const [lastYear, lastMonth] = allKeys[allKeys.length - 1].split('-').map(Number);
  const labels = [];

  for (let offset = limit - 1; offset >= 0; offset--) {
    const date = new Date(lastYear, lastMonth - 1 - offset, 1);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    labels.push(key);
  }

  return labels.map(key => {
    const [year, month] = key.split('-').map(Number);
    return {
      month: MONTH_LABELS[month - 1],
      count: months[key] || 0,
    };
  });
}
