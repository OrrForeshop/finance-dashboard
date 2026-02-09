// Finance dashboard (LTR) — localStorage only
// Spreadsheet-style tables (Google Sheets feel): fixed rows, direct editing, Tab/Enter navigation.

const STORAGE_KEY = 'finance-dashboard.v5';
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

function pct(actual, budget) {
  const a = n(actual);
  const b = n(budget);
  if (!(b > 0)) return '';
  return `${Math.round((a / b) * 100)}%`;
}

function padToRows(list) {
  const out = Array.isArray(list) ? list.slice(0, FIXED_ROWS) : [];
  while (out.length < FIXED_ROWS) out.push({ name: '', day: '', actual: '', budget: '' });
  return out.map(r => ({
    name: String(r?.name ?? ''),
    day: String(r?.day ?? ''),
    actual: r?.actual == null ? '' : String(r.actual),
    budget: r?.budget == null ? '' : String(r.budget),
  }));
}

function migrateFromV4() {
  // v4 stored: income (number), budgets (object), and {debt,savings,variable,fixed} arrays: {name, amount}
  // Convert to v5 tables: {name, day, actual, budget} for all sections + income table.
  try {
    const raw = localStorage.getItem('finance-dashboard.v4');
    if (!raw) return null;
    const old = JSON.parse(raw);
    if (!old || typeof old !== 'object' || !old.months) return null;

    const next = { months: {} };
    for (const [ym, ms0] of Object.entries(old.months)) {
      const ms = ms0 || {};
      const conv = (arr) => (arr || []).map(r => ({
        name: String(r?.name ?? ''),
        day: '',
        actual: r?.amount === 0 ? '' : String(r?.amount ?? ''),
        budget: '',
      }));

      const incomeVal = n(ms.income);
      const incomeRows = [{ name: 'Income', day: '', actual: incomeVal ? String(incomeVal) : '', budget: incomeVal ? String(incomeVal) : '' }];

      next.months[ym] = {
        income: padToRows(incomeRows),
        savings: padToRows(conv(ms.savings)),
        debt: padToRows(conv(ms.debt)),
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
      const migratedV4 = migrateFromV4();
      if (migratedV4) return migratedV4;
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
    income: padToRows([
      { name: 'Salary', day: '1', actual: '6500', budget: '6500' },
    ]),
    savings: padToRows([
      { name: 'Emergency Fund', day: '', actual: '350', budget: '600' },
    ]),
    debt: padToRows([
      { name: 'Credit Card', day: '', actual: '220', budget: '300' },
      { name: 'Car Loan', day: '', actual: '420', budget: '400' },
    ]),
    variable: padToRows([
      { name: 'Groceries', day: '', actual: '480', budget: '500' },
      { name: 'Dining', day: '', actual: '160', budget: '200' },
    ]),
    fixed: padToRows([
      { name: 'Rent', day: '', actual: '1900', budget: '1900' },
      { name: 'Internet', day: '', actual: '60', budget: '70' },
      { name: 'Phone', day: '', actual: '55', budget: '60' },
    ]),
  };
}

function normalizeMonth(ms) {
  ms.income = padToRows(ms.income);
  ms.savings = padToRows(ms.savings);
  ms.debt = padToRows(ms.debt);
  ms.variable = padToRows(ms.variable);
  ms.fixed = padToRows(ms.fixed);
  return ms;
}

const store = loadStore();

const els = {
  month: document.getElementById('month'),

  // tbodies
  tbodySavings: document.getElementById('tbodySavings'),
  tbodyDebt: document.getElementById('tbodyDebt'),
  tbodyVariable: document.getElementById('tbodyVariable'),
  tbodyFixed: document.getElementById('tbodyFixed'),
  tbodyIncome: document.getElementById('tbodyIncome'),

  // table totals (tfoot)
  totalSavingsActual: document.getElementById('totalSavingsActual'),
  totalSavingsBudget: document.getElementById('totalSavingsBudget'),
  totalDebtActual: document.getElementById('totalDebtActual'),
  totalDebtBudget: document.getElementById('totalDebtBudget'),
  totalVariableActual: document.getElementById('totalVariableActual'),
  totalVariableBudget: document.getElementById('totalVariableBudget'),
  totalFixedActual: document.getElementById('totalFixedActual'),
  totalFixedBudget: document.getElementById('totalFixedBudget'),
  totalIncomeActual: document.getElementById('totalIncomeActual'),
  totalIncomeBudget: document.getElementById('totalIncomeBudget'),

  // summary
  sumIncomeActual: document.getElementById('sumIncomeActual'),
  sumIncomeBudget: document.getElementById('sumIncomeBudget'),
  sumExpensesActual: document.getElementById('sumExpensesActual'),
  sumExpensesBudget: document.getElementById('sumExpensesBudget'),
  sumSavingsActual: document.getElementById('sumSavingsActual'),
  sumSavingsBudget: document.getElementById('sumSavingsBudget'),
  sumRemaining: document.getElementById('sumRemaining'),
  sumRemainingPill: document.getElementById('sumRemainingPill'),
};

els.month.value = todayMonth();

function getMonthState(ym) {
  if (!store.months[ym]) store.months[ym] = seedMonth();
  return normalizeMonth(store.months[ym]);
}

function sectionTotals(rows) {
  let actual = 0;
  let budget = 0;
  for (const r of (rows || [])) {
    actual += n(r.actual);
    budget += n(r.budget);
  }
  return { actual, budget };
}

function totals(ms) {
  const income = sectionTotals(ms.income);
  const savings = sectionTotals(ms.savings);
  const debt = sectionTotals(ms.debt);
  const variable = sectionTotals(ms.variable);
  const fixed = sectionTotals(ms.fixed);

  const expenses = { actual: debt.actual + variable.actual + fixed.actual, budget: debt.budget + variable.budget + fixed.budget };
  const remaining = income.actual - expenses.actual - savings.actual;

  return { income, savings, debt, variable, fixed, expenses, remaining };
}

function setProgressCell(td, actual, budget) {
  const el = td.querySelector('.progress');
  const txt = pct(actual, budget);
  el.textContent = txt || '';

  el.classList.remove('bad', 'good');
  const a = n(actual);
  const b = n(budget);
  if (b > 0) {
    if (a > b) el.classList.add('bad');
    else if (a === b) el.classList.add('good');
  }
}

function buildSheet(tbodyEl, sectionKey) {
  tbodyEl.innerHTML = '';
  for (let r = 0; r < FIXED_ROWS; r++) {
    const tr = document.createElement('tr');

    // Progress (computed)
    const tdProg = document.createElement('td');
    tdProg.className = 'col-progress';
    const prog = document.createElement('div');
    prog.className = 'progress';
    prog.dataset.section = sectionKey;
    prog.dataset.row = String(r);
    tdProg.appendChild(prog);

    // Actual
    const tdActual = document.createElement('td');
    const iActual = document.createElement('input');
    iActual.className = 'cell num';
    iActual.type = 'text';
    iActual.inputMode = 'decimal';
    iActual.autocomplete = 'off';
    iActual.dataset.section = sectionKey;
    iActual.dataset.row = String(r);
    iActual.dataset.col = '1';
    tdActual.appendChild(iActual);

    // Budget
    const tdBudget = document.createElement('td');
    const iBudget = document.createElement('input');
    iBudget.className = 'cell num';
    iBudget.type = 'text';
    iBudget.inputMode = 'decimal';
    iBudget.autocomplete = 'off';
    iBudget.dataset.section = sectionKey;
    iBudget.dataset.row = String(r);
    iBudget.dataset.col = '2';
    tdBudget.appendChild(iBudget);

    // Day
    const tdDay = document.createElement('td');
    const iDay = document.createElement('input');
    iDay.className = 'cell day';
    iDay.type = 'text';
    iDay.inputMode = 'numeric';
    iDay.autocomplete = 'off';
    iDay.dataset.section = sectionKey;
    iDay.dataset.row = String(r);
    iDay.dataset.col = '3';
    tdDay.appendChild(iDay);

    // Name
    const tdName = document.createElement('td');
    const iName = document.createElement('input');
    iName.className = 'cell';
    iName.type = 'text';
    iName.autocomplete = 'off';
    iName.spellcheck = false;
    iName.dataset.section = sectionKey;
    iName.dataset.row = String(r);
    iName.dataset.col = '4';
    tdName.appendChild(iName);

    tr.appendChild(tdProg);
    tr.appendChild(tdActual);
    tr.appendChild(tdBudget);
    tr.appendChild(tdDay);
    tr.appendChild(tdName);
    tbodyEl.appendChild(tr);
  }
}

function fillSheet(tbodyEl, sectionKey, ms) {
  const rows = ms[sectionKey];

  for (let r = 0; r < FIXED_ROWS; r++) {
    const row = rows[r] || { name: '', day: '', actual: '', budget: '' };
    const tr = tbodyEl.children[r];
    if (!tr) continue;

    // progress td 0
    setProgressCell(tr.children[0], row.actual, row.budget);

    const iActual = tr.querySelector('input.cell[data-col="1"]');
    const iBudget = tr.querySelector('input.cell[data-col="2"]');
    const iDay = tr.querySelector('input.cell[data-col="3"]');
    const iName = tr.querySelector('input.cell[data-col="4"]');

    if (iActual) iActual.value = row.actual ?? '';
    if (iBudget) iBudget.value = row.budget ?? '';
    if (iDay) iDay.value = row.day ?? '';
    if (iName) iName.value = row.name ?? '';
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

  const minCol = 1;
  const maxCol = 4;

  // Enter moves down
  if (e.key === 'Enter') {
    e.preventDefault();
    const nextRow = Math.min(FIXED_ROWS - 1, row + 1);
    focusCell(section, nextRow, col);
    return;
  }

  // Tab wraps inside table
  if (e.key === 'Tab') {
    e.preventDefault();
    const dir = e.shiftKey ? -1 : 1;

    let nextCol = col + dir;
    let nextRow = row;

    if (nextCol < minCol) {
      nextCol = maxCol;
      nextRow = Math.max(0, row - 1);
    }
    if (nextCol > maxCol) {
      nextCol = minCol;
      nextRow = Math.min(FIXED_ROWS - 1, row + 1);
    }

    focusCell(section, nextRow, nextCol);
  }
}

let derivedTimer = null;
function scheduleDerivedUpdate(ms) {
  window.clearTimeout(derivedTimer);
  derivedTimer = window.setTimeout(() => updateDerived(ms), 50);
}

function updateTableFooters(ms) {
  const t = totals(ms);

  els.totalSavingsActual.textContent = money(t.savings.actual);
  els.totalSavingsBudget.textContent = money(t.savings.budget);

  els.totalDebtActual.textContent = money(t.debt.actual);
  els.totalDebtBudget.textContent = money(t.debt.budget);

  els.totalVariableActual.textContent = money(t.variable.actual);
  els.totalVariableBudget.textContent = money(t.variable.budget);

  els.totalFixedActual.textContent = money(t.fixed.actual);
  els.totalFixedBudget.textContent = money(t.fixed.budget);

  els.totalIncomeActual.textContent = money(t.income.actual);
  els.totalIncomeBudget.textContent = money(t.income.budget);
}

function updateSummary(ms) {
  const t = totals(ms);

  els.sumIncomeActual.textContent = money(t.income.actual);
  els.sumIncomeBudget.textContent = money(t.income.budget);

  els.sumExpensesActual.textContent = money(t.expenses.actual);
  els.sumExpensesBudget.textContent = money(t.expenses.budget);

  els.sumSavingsActual.textContent = money(t.savings.actual);
  els.sumSavingsBudget.textContent = money(t.savings.budget);

  els.sumRemaining.textContent = money(t.remaining);

  const ok = t.remaining >= 0;
  els.sumRemainingPill.style.color = ok ? 'rgba(22,163,74,.95)' : 'rgba(220,38,38,.95)';
  els.sumRemainingPill.style.borderColor = ok ? 'rgba(22,163,74,.25)' : 'rgba(220,38,38,.25)';
  els.sumRemainingPill.style.background = ok ? 'rgba(22,163,74,.10)' : 'rgba(220,38,38,.08)';
}

function updateDerived(ms) {
  // Keep inputs stable (don't re-fill while typing). Only update derived totals + summary.
  updateTableFooters(ms);
  updateSummary(ms);
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

  const cell = ms[section]?.[row];
  if (!cell) return;

  // col mapping: 1 actual, 2 budget, 3 day, 4 name
  if (col === 1) cell.actual = t.value;
  if (col === 2) cell.budget = t.value;
  if (col === 3) cell.day = t.value;
  if (col === 4) cell.name = t.value;

  saveStore(store);

  // Update just the progress in this row quickly
  const tr = t.closest('tr');
  if (tr) setProgressCell(tr.children[0], cell.actual, cell.budget);

  scheduleDerivedUpdate(ms);
}

function renderAll() {
  const ym = els.month.value || todayMonth();
  const ms = getMonthState(ym);

  // Build tables once
  if (!els.tbodySavings.dataset.built) {
    buildSheet(els.tbodySavings, 'savings');
    buildSheet(els.tbodyDebt, 'debt');
    buildSheet(els.tbodyVariable, 'variable');
    buildSheet(els.tbodyFixed, 'fixed');
    buildSheet(els.tbodyIncome, 'income');

    els.tbodySavings.dataset.built = '1';

    document.addEventListener('keydown', onGridKeydown);
    document.addEventListener('input', onGridInput);
  }

  fillSheet(els.tbodySavings, 'savings', ms);
  fillSheet(els.tbodyDebt, 'debt', ms);
  fillSheet(els.tbodyVariable, 'variable', ms);
  fillSheet(els.tbodyFixed, 'fixed', ms);
  fillSheet(els.tbodyIncome, 'income', ms);

  updateTableFooters(ms);
  updateSummary(ms);
}

// Events
els.month.addEventListener('input', () => {
  const ym = els.month.value || todayMonth();
  getMonthState(ym);
  saveStore(store);
  renderAll();
});

// Initial
getMonthState(els.month.value || todayMonth());
saveStore(store);
renderAll();
