// Finance dashboard (LTR) — localStorage only
// Layout rebuilt to match purple/muted screenshot style.

const STORAGE_KEY = 'finance-dashboard.v3';

function todayMonth() {
  return new Date().toISOString().slice(0, 7);
}

function n(v) {
  const x = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(x) ? x : 0;
}

function money(v) {
  const val = n(v);
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function migrateFromV2() {
  try {
    const raw = localStorage.getItem('finance-dashboard.v2');
    if (!raw) return null;
    const old = JSON.parse(raw);
    if (!old || typeof old !== 'object' || !old.months) return null;

    const next = { months: {} };
    for (const [ym, ms] of Object.entries(old.months)) {
      const income = (ms?.in || []).reduce((a, r) => a + n(r.amount), 0);
      const variable = (ms?.out || []).map(r => ({ id: uid(), name: r.name ?? 'Expense', amount: n(r.amount) }));
      const savings = (ms?.savings || []).map(r => ({ id: uid(), name: r.name ?? 'Savings', amount: n(r.amount) }));

      next.months[ym] = {
        income,
        budgets: { debt: 0, savings: 0, variable: 0, fixed: 0 },
        debt: [],
        savings,
        variable,
        fixed: [],
      };
    }
    return next;
  } catch {
    return null;
  }
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // One-time migration from earlier simple dashboard
      const migrated = migrateFromV2();
      if (migrated) return migrated;
      return { months: {} };
    }
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return { months: {} };
    if (!data.months || typeof data.months !== 'object') data.months = {};
    return data;
  } catch {
    return { months: {} };
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function seedMonth() {
  return {
    income: 6500,
    budgets: {
      debt: 700,
      savings: 600,
      variable: 900,
      fixed: 2400,
    },
    debt: [
      { id: uid(), name: 'Credit Card', amount: 220 },
      { id: uid(), name: 'Car Loan', amount: 420 },
    ],
    savings: [
      { id: uid(), name: 'Emergency Fund', amount: 350 },
    ],
    variable: [
      { id: uid(), name: 'Groceries', amount: 480 },
      { id: uid(), name: 'Dining', amount: 160 },
    ],
    fixed: [
      { id: uid(), name: 'Rent', amount: 1900 },
      { id: uid(), name: 'Internet', amount: 60 },
      { id: uid(), name: 'Phone', amount: 55 },
    ],
  };
}

const els = {
  month: document.getElementById('month'),
  income: document.getElementById('income'),
  budgetDebt: document.getElementById('budgetDebt'),
  budgetSavings: document.getElementById('budgetSavings'),
  budgetVariable: document.getElementById('budgetVariable'),
  budgetFixed: document.getElementById('budgetFixed'),

  kpiDebt: document.getElementById('kpiDebt'),
  kpiSavings: document.getElementById('kpiSavings'),
  kpiVariable: document.getElementById('kpiVariable'),
  kpiFixed: document.getElementById('kpiFixed'),

  ovTotalExpenses: document.getElementById('ovTotalExpenses'),
  ovTotalSaved: document.getElementById('ovTotalSaved'),
  ovRemaining: document.getElementById('ovRemaining'),

  donutLabel: document.getElementById('donutLabel'),

  tbodyDebt: document.getElementById('tbodyDebt'),
  tbodyVariable: document.getElementById('tbodyVariable'),
  tbodyFixed: document.getElementById('tbodyFixed'),
  tbodySavings: document.getElementById('tbodySavings'),

  addDebt: document.getElementById('addDebt'),
  addVariable: document.getElementById('addVariable'),
  addFixed: document.getElementById('addFixed'),
  addSavings: document.getElementById('addSavings'),

  chartDistribution: document.getElementById('chartDistribution'),
  chartBudget: document.getElementById('chartBudget'),
  chartRemaining: document.getElementById('chartRemaining'),
};

const store = loadStore();
els.month.value = todayMonth();

function normalizeMonth(ms) {
  ms.income ??= 0;
  ms.budgets ||= {};
  ms.budgets.debt ??= 0;
  ms.budgets.savings ??= 0;
  ms.budgets.variable ??= 0;
  ms.budgets.fixed ??= 0;

  ms.debt ||= [];
  ms.savings ||= [];
  ms.variable ||= [];
  ms.fixed ||= [];

  return ms;
}

function getMonthState(ym) {
  if (!store.months[ym]) store.months[ym] = seedMonth();
  return normalizeMonth(store.months[ym]);
}

function sum(list) {
  return (list || []).reduce((a, r) => a + n(r.amount), 0);
}

function totals(ms) {
  const debt = sum(ms.debt);
  const savings = sum(ms.savings);
  const variable = sum(ms.variable);
  const fixed = sum(ms.fixed);

  const totalExpenses = debt + variable + fixed;
  const totalSaved = savings;
  const remaining = n(ms.income) - totalExpenses - totalSaved;
  return { debt, savings, variable, fixed, totalExpenses, totalSaved, remaining };
}

function makeRow({ sectionKey, row, onChange, onDelete }) {
  const tr = document.createElement('div');
  tr.className = 'tr';
  tr.setAttribute('role', 'row');

  const tdName = document.createElement('div');
  tdName.className = 'td';
  tdName.setAttribute('role', 'cell');
  const iName = document.createElement('input');
  iName.type = 'text';
  iName.value = row.name ?? '';
  iName.autocomplete = 'off';
  iName.addEventListener('input', () => onChange({ ...row, name: iName.value }));
  tdName.appendChild(iName);

  const tdAmt = document.createElement('div');
  tdAmt.className = 'td';
  tdAmt.setAttribute('role', 'cell');
  const iAmt = document.createElement('input');
  iAmt.type = 'number';
  iAmt.step = '0.01';
  iAmt.inputMode = 'decimal';
  iAmt.value = row.amount ?? 0;
  iAmt.addEventListener('input', () => onChange({ ...row, amount: n(iAmt.value) }));
  tdAmt.appendChild(iAmt);

  const tdDel = document.createElement('div');
  tdDel.className = 'td';
  tdDel.setAttribute('role', 'cell');
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'icon-btn';
  del.title = `Delete ${sectionKey} item`;
  del.setAttribute('aria-label', `Delete ${sectionKey} item`);
  del.textContent = '🗑';
  del.addEventListener('click', (e) => {
    e.preventDefault();
    onDelete();
  });
  tdDel.appendChild(del);

  tr.appendChild(tdName);
  tr.appendChild(tdAmt);
  tr.appendChild(tdDel);

  return tr;
}

let distributionChart = null;
let budgetChart = null;
let remainingChart = null;

function chartDefaults() {
  Chart.defaults.color = 'rgba(255,255,255,0.72)';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.10)';
  Chart.defaults.font.family = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
}

function destroyCharts() {
  distributionChart?.destroy();
  budgetChart?.destroy();
  remainingChart?.destroy();
  distributionChart = null;
  budgetChart = null;
  remainingChart = null;
}

function renderCharts(ms) {
  chartDefaults();

  const { debt, savings, variable, fixed, remaining } = totals(ms);

  const distData = [debt, variable, fixed, savings];
  const distLabels = ['Debt', 'Variable', 'Fixed', 'Savings'];

  if (distributionChart) distributionChart.destroy();
  distributionChart = new Chart(els.chartDistribution, {
    type: 'pie',
    data: {
      labels: distLabels,
      datasets: [{
        data: distData,
        backgroundColor: ['rgba(139,92,246,.85)','rgba(236,72,153,.65)','rgba(34,211,238,.55)','rgba(52,211,153,.55)'],
        borderColor: 'rgba(255,255,255,.12)',
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10 } },
        tooltip: {
          callbacks: { label: (ctx) => `${ctx.label}: ${money(ctx.parsed)}` }
        }
      }
    }
  });

  const b = ms.budgets || {};
  const budgetLabels = ['Debt', 'Savings', 'Variable', 'Fixed'];
  const budgetValues = [n(b.debt), n(b.savings), n(b.variable), n(b.fixed)];
  const actualValues = [debt, savings, variable, fixed];

  if (budgetChart) budgetChart.destroy();
  budgetChart = new Chart(els.chartBudget, {
    type: 'bar',
    data: {
      labels: budgetLabels,
      datasets: [
        {
          label: 'Budget',
          data: budgetValues,
          backgroundColor: 'rgba(167,139,250,.35)',
          borderColor: 'rgba(167,139,250,.55)',
          borderWidth: 1,
          borderRadius: 10,
        },
        {
          label: 'Actual',
          data: actualValues,
          backgroundColor: 'rgba(139,92,246,.75)',
          borderColor: 'rgba(139,92,246,.9)',
          borderWidth: 1,
          borderRadius: 10,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          ticks: { callback: (v) => `$${v}` },
          grid: { color: 'rgba(255,255,255,.08)' }
        },
        x: { grid: { display: false } }
      },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${money(ctx.parsed.y)}` } }
      }
    }
  });

  // Remaining donut: remaining vs spent
  const spent = Math.max(0, n(ms.income) - Math.max(remaining, 0));
  const donutRemaining = Math.max(0, remaining);

  if (remainingChart) remainingChart.destroy();
  remainingChart = new Chart(els.chartRemaining, {
    type: 'doughnut',
    data: {
      labels: ['Remaining', 'Used'],
      datasets: [{
        data: [donutRemaining, spent],
        backgroundColor: ['rgba(52,211,153,.7)', 'rgba(255,255,255,.08)'],
        borderColor: 'rgba(255,255,255,.10)',
        borderWidth: 1,
        hoverOffset: 6,
        cutout: '72%'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${money(ctx.parsed)}` } }
      }
    }
  });

  els.donutLabel.textContent = money(remaining);
  els.donutLabel.style.color = remaining >= 0 ? 'rgba(167,139,250,.95)' : 'rgba(251,113,133,.95)';
  els.donutLabel.style.borderColor = remaining >= 0 ? 'rgba(167,139,250,.25)' : 'rgba(251,113,133,.25)';
  els.donutLabel.style.background = remaining >= 0 ? 'rgba(139,92,246,.15)' : 'rgba(251,113,133,.10)';
}

function render() {
  const ym = els.month.value || todayMonth();
  const ms = getMonthState(ym);

  // Settings inputs
  els.income.value = n(ms.income);
  els.budgetDebt.value = n(ms.budgets?.debt);
  els.budgetSavings.value = n(ms.budgets?.savings);
  els.budgetVariable.value = n(ms.budgets?.variable);
  els.budgetFixed.value = n(ms.budgets?.fixed);

  const t = totals(ms);

  // KPIs
  els.kpiDebt.textContent = money(t.debt);
  els.kpiSavings.textContent = money(t.savings);
  els.kpiVariable.textContent = money(t.variable);
  els.kpiFixed.textContent = money(t.fixed);

  // Overview
  els.ovTotalExpenses.textContent = money(t.totalExpenses);
  els.ovTotalSaved.textContent = money(t.totalSaved);
  els.ovRemaining.textContent = money(t.remaining);
  els.ovRemaining.style.color = t.remaining >= 0 ? 'rgba(52,211,153,.95)' : 'rgba(251,113,133,.95)';

  // Tables
  const draw = (tbody, sectionKey) => {
    tbody.innerHTML = '';
    ms[sectionKey].forEach((row) => {
      tbody.appendChild(makeRow({
        sectionKey,
        row,
        onChange: (next) => {
          const idx = ms[sectionKey].findIndex(r => r.id === row.id);
          if (idx >= 0) ms[sectionKey][idx] = next;
          saveStore(store);
          render();
        },
        onDelete: () => {
          const idx = ms[sectionKey].findIndex(r => r.id === row.id);
          if (idx >= 0) ms[sectionKey].splice(idx, 1);
          saveStore(store);
          render();
        }
      }));
    });
  };

  draw(els.tbodyDebt, 'debt');
  draw(els.tbodyVariable, 'variable');
  draw(els.tbodyFixed, 'fixed');
  draw(els.tbodySavings, 'savings');

  renderCharts(ms);
}

function addItem(sectionKey, defaults) {
  const ym = els.month.value || todayMonth();
  const ms = getMonthState(ym);
  ms[sectionKey].push({ id: uid(), ...defaults });
  saveStore(store);
  render();
}

function updateSettings(patchFn) {
  const ym = els.month.value || todayMonth();
  const ms = getMonthState(ym);
  patchFn(ms);
  saveStore(store);
  render();
}

// Events
els.month.addEventListener('input', () => {
  const ym = els.month.value || todayMonth();
  getMonthState(ym);
  saveStore(store);
  render();
});

els.income.addEventListener('input', () => updateSettings(ms => { ms.income = n(els.income.value); }));

els.budgetDebt.addEventListener('input', () => updateSettings(ms => { ms.budgets.debt = n(els.budgetDebt.value); }));
els.budgetSavings.addEventListener('input', () => updateSettings(ms => { ms.budgets.savings = n(els.budgetSavings.value); }));
els.budgetVariable.addEventListener('input', () => updateSettings(ms => { ms.budgets.variable = n(els.budgetVariable.value); }));
els.budgetFixed.addEventListener('input', () => updateSettings(ms => { ms.budgets.fixed = n(els.budgetFixed.value); }));

els.addDebt.addEventListener('click', () => addItem('debt', { name: 'New debt', amount: 0 }));
els.addVariable.addEventListener('click', () => addItem('variable', { name: 'New expense', amount: 0 }));
els.addFixed.addEventListener('click', () => addItem('fixed', { name: 'New expense', amount: 0 }));
els.addSavings.addEventListener('click', () => addItem('savings', { name: 'New savings', amount: 0 }));

// Initial
getMonthState(els.month.value || todayMonth());
saveStore(store);
render();
