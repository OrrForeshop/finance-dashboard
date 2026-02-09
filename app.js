// Finance dashboard (LTR) — localStorage only
// Spreadsheet-style tables (Google Sheets feel): fixed rows, direct editing, Tab/Enter navigation.

const STORAGE_KEY = 'finance-dashboard.v4';
const FIXED_ROWS = 20;

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
  // v2 had months: { ym: { in/out/savings arrays } }
  try {
    const raw = localStorage.getItem('finance-dashboard.v2');
    if (!raw) return null;
    const old = JSON.parse(raw);
    if (!old || typeof old !== 'object' || !old.months) return null;

    const next = { months: {} };
    for (const [ym, ms] of Object.entries(old.months)) {
      const income = (ms?.in || []).reduce((a, r) => a + n(r.amount), 0);
      const variable = (ms?.out || []).map(r => ({ name: r.name ?? 'Expense', amount: String(n(r.amount) || '') }));
      const savings = (ms?.savings || []).map(r => ({ name: r.name ?? 'Savings', amount: String(n(r.amount) || '') }));

      next.months[ym] = {
        income,
        budgets: { debt: 0, savings: 0, variable: 0, fixed: 0 },
        debt: padToRows([]),
        savings: padToRows(savings),
        variable: padToRows(variable),
        fixed: padToRows([]),
      };
    }
    return next;
  } catch {
    return null;
  }
}

function migrateFromV3() {
  // v3 stored arrays with ids + add/delete behavior. Convert to fixed rows.
  try {
    const raw = localStorage.getItem('finance-dashboard.v3');
    if (!raw) return null;
    const old = JSON.parse(raw);
    if (!old || typeof old !== 'object' || !old.months) return null;

    const next = { months: {} };
    for (const [ym, ms0] of Object.entries(old.months)) {
      const ms = ms0 || {};
      const conv = (arr) => (arr || []).map(r => ({
        name: String(r?.name ?? ''),
        amount: r?.amount === 0 ? '' : String(r?.amount ?? ''),
      }));

      next.months[ym] = {
        income: n(ms.income),
        budgets: {
          debt: n(ms.budgets?.debt),
          savings: n(ms.budgets?.savings),
          variable: n(ms.budgets?.variable),
          fixed: n(ms.budgets?.fixed),
        },
        debt: padToRows(conv(ms.debt)),
        savings: padToRows(conv(ms.savings)),
        variable: padToRows(conv(ms.variable)),
        fixed: padToRows(conv(ms.fixed)),
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
      const migratedV3 = migrateFromV3();
      if (migratedV3) return migratedV3;
      const migratedV2 = migrateFromV2();
      if (migratedV2) return migratedV2;
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

function padToRows(list) {
  const out = Array.isArray(list) ? list.slice(0, FIXED_ROWS) : [];
  while (out.length < FIXED_ROWS) out.push({ name: '', amount: '' });
  return out.map(r => ({ name: String(r?.name ?? ''), amount: r?.amount == null ? '' : String(r.amount) }));
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
    debt: padToRows([
      { name: 'Credit Card', amount: '220' },
      { name: 'Car Loan', amount: '420' },
    ]),
    savings: padToRows([
      { name: 'Emergency Fund', amount: '350' },
    ]),
    variable: padToRows([
      { name: 'Groceries', amount: '480' },
      { name: 'Dining', amount: '160' },
    ]),
    fixed: padToRows([
      { name: 'Rent', amount: '1900' },
      { name: 'Internet', amount: '60' },
      { name: 'Phone', amount: '55' },
    ]),
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

  ms.debt = padToRows(ms.debt);
  ms.savings = padToRows(ms.savings);
  ms.variable = padToRows(ms.variable);
  ms.fixed = padToRows(ms.fixed);

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

let distributionChart = null;
let budgetChart = null;
let remainingChart = null;

function chartDefaults() {
  Chart.defaults.color = 'rgba(17, 24, 39, 0.85)';
  Chart.defaults.borderColor = 'rgba(17, 24, 39, 0.12)';
  Chart.defaults.font.family = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
}

function ensureCharts() {
  chartDefaults();
  if (!distributionChart) {
    distributionChart = new Chart(els.chartDistribution, {
      type: 'pie',
      data: {
        labels: ['Debt', 'Variable', 'Fixed', 'Savings'],
        datasets: [{
          data: [0, 0, 0, 0],
          backgroundColor: ['rgba(37,99,235,.85)','rgba(17,24,39,.55)','rgba(107,114,128,.45)','rgba(22,163,74,.55)'],
          borderColor: 'rgba(17,24,39,.12)',
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10 } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${money(ctx.parsed)}` } }
        }
      }
    });
  }

  if (!budgetChart) {
    budgetChart = new Chart(els.chartBudget, {
      type: 'bar',
      data: {
        labels: ['Debt', 'Savings', 'Variable', 'Fixed'],
        datasets: [
          {
            label: 'Budget',
            data: [0, 0, 0, 0],
            backgroundColor: 'rgba(37,99,235,.18)',
            borderColor: 'rgba(37,99,235,.35)',
            borderWidth: 1,
            borderRadius: 10,
          },
          {
            label: 'Actual',
            data: [0, 0, 0, 0],
            backgroundColor: 'rgba(37,99,235,.70)',
            borderColor: 'rgba(37,99,235,.85)',
            borderWidth: 1,
            borderRadius: 10,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { ticks: { callback: (v) => `$${v}` }, grid: { color: 'rgba(17,24,39,.10)' } },
          x: { grid: { display: false } }
        },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${money(ctx.parsed.y)}` } }
        }
      }
    });
  }

  if (!remainingChart) {
    remainingChart = new Chart(els.chartRemaining, {
      type: 'doughnut',
      data: {
        labels: ['Remaining', 'Used'],
        datasets: [{
          data: [0, 0],
          backgroundColor: ['rgba(22,163,74,.70)', 'rgba(17,24,39,.10)'],
          borderColor: 'rgba(17,24,39,.12)',
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
  }
}

function updateCharts(ms) {
  ensureCharts();

  const { debt, savings, variable, fixed, remaining } = totals(ms);

  // pie
  distributionChart.data.datasets[0].data = [debt, variable, fixed, savings];
  distributionChart.update();

  // bar
  const b = ms.budgets || {};
  budgetChart.data.datasets[0].data = [n(b.debt), n(b.savings), n(b.variable), n(b.fixed)];
  budgetChart.data.datasets[1].data = [debt, savings, variable, fixed];
  budgetChart.update();

  // donut: remaining vs used
  const spent = Math.max(0, n(ms.income) - Math.max(remaining, 0));
  const donutRemaining = Math.max(0, remaining);
  remainingChart.data.datasets[0].data = [donutRemaining, spent];
  remainingChart.update();

  els.donutLabel.textContent = money(remaining);
  const ok = remaining >= 0;
  els.donutLabel.style.color = ok ? 'rgba(37,99,235,.95)' : 'rgba(220,38,38,.95)';
  els.donutLabel.style.borderColor = ok ? 'rgba(37,99,235,.20)' : 'rgba(220,38,38,.25)';
  els.donutLabel.style.background = ok ? 'rgba(37,99,235,.10)' : 'rgba(220,38,38,.08)';
}

function fillSettings(ms) {
  els.income.value = n(ms.income);
  els.budgetDebt.value = n(ms.budgets?.debt);
  els.budgetSavings.value = n(ms.budgets?.savings);
  els.budgetVariable.value = n(ms.budgets?.variable);
  els.budgetFixed.value = n(ms.budgets?.fixed);
}

function updateDerived(ms) {
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
  els.ovRemaining.style.color = t.remaining >= 0 ? 'rgba(22,163,74,.95)' : 'rgba(220,38,38,.95)';

  updateCharts(ms);
}

function buildSheet(tbodyEl, sectionKey) {
  tbodyEl.innerHTML = '';
  for (let r = 0; r < FIXED_ROWS; r++) {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    const iName = document.createElement('input');
    iName.className = 'cell';
    iName.type = 'text';
    iName.autocomplete = 'off';
    iName.spellcheck = false;
    iName.dataset.section = sectionKey;
    iName.dataset.row = String(r);
    iName.dataset.col = '0';
    tdName.appendChild(iName);

    const tdAmt = document.createElement('td');
    const iAmt = document.createElement('input');
    iAmt.className = 'cell amt';
    iAmt.type = 'text';
    iAmt.inputMode = 'decimal';
    iAmt.autocomplete = 'off';
    iAmt.dataset.section = sectionKey;
    iAmt.dataset.row = String(r);
    iAmt.dataset.col = '1';
    tdAmt.appendChild(iAmt);

    tr.appendChild(tdName);
    tr.appendChild(tdAmt);
    tbodyEl.appendChild(tr);
  }
}

function fillSheet(tbodyEl, sectionKey, ms) {
  const rows = ms[sectionKey];
  const inputs = tbodyEl.querySelectorAll('input.cell');
  for (const el of inputs) {
    const r = parseInt(el.dataset.row, 10);
    const c = parseInt(el.dataset.col, 10);
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;

    const row = rows[r] || { name: '', amount: '' };
    if (c === 0) el.value = row.name ?? '';
    if (c === 1) el.value = row.amount ?? '';
  }
}

function focusCell(section, row, col) {
  const selector = `input.cell[data-section="${section}"][data-row="${row}"][data-col="${col}"]`;
  const el = document.querySelector(selector);
  if (el) {
    el.focus();
    try { el.setSelectionRange(el.value.length, el.value.length); } catch {}
  }
}

function onGridKeydown(e) {
  const t = e.target;
  if (!(t instanceof HTMLInputElement)) return;
  if (!t.classList.contains('cell')) return;

  const section = t.dataset.section;
  const row = parseInt(t.dataset.row, 10);
  const col = parseInt(t.dataset.col, 10);
  if (!section || !Number.isFinite(row) || !Number.isFinite(col)) return;

  // Enter should move down (like Sheets)
  if (e.key === 'Enter') {
    e.preventDefault();
    const nextRow = Math.min(FIXED_ROWS - 1, row + 1);
    focusCell(section, nextRow, col);
    return;
  }

  // Tab should keep spreadsheet feel (wrap inside the table)
  if (e.key === 'Tab') {
    e.preventDefault();
    const dir = e.shiftKey ? -1 : 1;
    let nextCol = col + dir;
    let nextRow = row;

    if (nextCol < 0) { nextCol = 1; nextRow = Math.max(0, row - 1); }
    if (nextCol > 1) { nextCol = 0; nextRow = Math.min(FIXED_ROWS - 1, row + 1); }

    focusCell(section, nextRow, nextCol);
  }
}

let derivedTimer = null;
function scheduleDerivedUpdate(ms) {
  window.clearTimeout(derivedTimer);
  derivedTimer = window.setTimeout(() => updateDerived(ms), 60);
}

function onGridInput(e) {
  const t = e.target;
  if (!(t instanceof HTMLInputElement)) return;
  if (!t.classList.contains('cell')) return;

  const section = t.dataset.section;
  const row = parseInt(t.dataset.row, 10);
  const col = parseInt(t.dataset.col, 10);
  if (!section || !Number.isFinite(row) || !Number.isFinite(col)) return;

  const ym = els.month.value || todayMonth();
  const ms = getMonthState(ym);

  const cell = ms[section][row];
  if (!cell) return;

  if (col === 0) cell.name = t.value;
  if (col === 1) cell.amount = t.value;

  saveStore(store);
  scheduleDerivedUpdate(ms);
}

function renderAll() {
  const ym = els.month.value || todayMonth();
  const ms = getMonthState(ym);

  fillSettings(ms);

  // Tables (build once then just fill)
  if (!els.tbodyDebt.dataset.built) {
    buildSheet(els.tbodyDebt, 'debt');
    els.tbodyDebt.dataset.built = '1';
    buildSheet(els.tbodyVariable, 'variable');
    els.tbodyVariable.dataset.built = '1';
    buildSheet(els.tbodyFixed, 'fixed');
    els.tbodyFixed.dataset.built = '1';
    buildSheet(els.tbodySavings, 'savings');
    els.tbodySavings.dataset.built = '1';

    // Event delegation once
    document.addEventListener('keydown', onGridKeydown);
    document.addEventListener('input', onGridInput);
  }

  fillSheet(els.tbodyDebt, 'debt', ms);
  fillSheet(els.tbodyVariable, 'variable', ms);
  fillSheet(els.tbodyFixed, 'fixed', ms);
  fillSheet(els.tbodySavings, 'savings', ms);

  updateDerived(ms);
}

function updateSettings(patchFn) {
  const ym = els.month.value || todayMonth();
  const ms = getMonthState(ym);
  patchFn(ms);
  saveStore(store);
  updateDerived(ms);
}

// Events
els.month.addEventListener('input', () => {
  const ym = els.month.value || todayMonth();
  getMonthState(ym);
  saveStore(store);
  renderAll();
});

els.income.addEventListener('input', () => updateSettings(ms => { ms.income = n(els.income.value); }));
els.budgetDebt.addEventListener('input', () => updateSettings(ms => { ms.budgets.debt = n(els.budgetDebt.value); }));
els.budgetSavings.addEventListener('input', () => updateSettings(ms => { ms.budgets.savings = n(els.budgetSavings.value); }));
els.budgetVariable.addEventListener('input', () => updateSettings(ms => { ms.budgets.variable = n(els.budgetVariable.value); }));
els.budgetFixed.addEventListener('input', () => updateSettings(ms => { ms.budgets.fixed = n(els.budgetFixed.value); }));

// Initial
getMonthState(els.month.value || todayMonth());
saveStore(store);
renderAll();
