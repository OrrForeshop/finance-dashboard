const seed = {
  income: [
    { source: '💼 Salary', planned: 5000, actual: 5000 },
    { source: '🧰 Side work', planned: 300, actual: 250 },
  ],
  savings: [
    { goal: '🛟 Emergency fund', target: 12000, current: 4500 },
    { goal: '🏖️ Vacation', target: 3000, current: 900 },
  ],
  fixed: [
    { category: '🏠 Rent', planned: 1500, actual: 1500 },
    { category: '📱 Phone', planned: 60, actual: 60 },
  ],
  variable: [
    { category: '🛒 Groceries', planned: 500, actual: 470 },
    { category: '🚗 Transport', planned: 180, actual: 210 },
  ],
  debt: [
    { debt: '💳 Credit Card', balance: 2500, payment: 180, apr: 19 },
    { debt: '🚙 Car Loan', balance: 9800, payment: 250, apr: 6.2 },
  ],
  assets: [
    { asset: '🏦 Cash & Bank', value: 6200 },
    { asset: '📈 Investments', value: 14500 },
  ],
  liabilities: [
    { liability: '💳 Credit Card Balance', value: 2500 },
    { liability: '🚙 Car Loan Balance', value: 9800 },
  ]
};

const monthInput = document.getElementById('month');
monthInput.value = new Date().toISOString().slice(0, 7);
monthInput.addEventListener('input', () => recalc());

function n(v) {
  const x = parseFloat(v);
  return Number.isFinite(x) ? x : 0;
}
function money(v) {
  return `$${n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function pct(v) {
  return `${n(v).toFixed(1)}%`;
}

function normalizeName(s) {
  return String(s || '')
    .toLowerCase()
    // strip most emoji / symbols
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function updateTrafficLight(td, row) {
  if (!td) return;
  td.classList.remove('tl-green', 'tl-yellow', 'tl-red');

  const planned = n(row.planned);
  const actual = n(row.actual);
  if (planned <= 0) {
    if (actual > 0) td.classList.add('tl-red');
    return;
  }

  const ratio = actual / planned;
  if (ratio <= 0.9) td.classList.add('tl-green');
  else if (ratio <= 1.05) td.classList.add('tl-yellow');
  else td.classList.add('tl-red');
}

function renderTable(tableId, rows, fields, opts = {}) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = '';

  rows.forEach((row, i) => {
    const tr = document.createElement('tr');

    let plannedCell = null;
    let actualCell = null;

    fields.forEach((f) => {
      const td = document.createElement('td');
      td.dataset.label = f.label || f.key;

      const input = document.createElement('input');
      input.value = row[f.key] ?? '';
      input.type = f.type || 'text';
      input.inputMode = f.type === 'number' ? 'decimal' : 'text';

      if (opts.trafficLight && f.key === 'planned') plannedCell = td;
      if (opts.trafficLight && f.key === 'actual') actualCell = td;

      input.addEventListener('input', (e) => {
        row[f.key] = f.type === 'number' ? n(e.target.value) : e.target.value;

        if (opts.trafficLight) {
          updateTrafficLight(actualCell, row);
        }

        recalc();
      });

      td.appendChild(input);
      tr.appendChild(td);
    });

    if (opts.trafficLight) {
      updateTrafficLight(actualCell, row);
    }

    if (opts.deletable) {
      const td = document.createElement('td');
      td.className = 'td-action';
      td.dataset.label = 'Delete';

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn-icon';
      del.textContent = '🗑️';
      del.title = 'Delete row';
      del.setAttribute('aria-label', 'Delete row');
      del.addEventListener('click', (e) => {
        e.preventDefault();
        rows.splice(i, 1);
        renderAll();
      });

      td.appendChild(del);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  });
}

function addRow(type) {
  if (type === 'income') seed.income.push({ source: '💰 New income', planned: 0, actual: 0 });
  if (type === 'savings') seed.savings.push({ goal: '🎯 New goal', target: 0, current: 0 });
  if (type === 'fixed') seed.fixed.push({ category: '🧾 New bill', planned: 0, actual: 0 });
  if (type === 'variable') seed.variable.push({ category: '🧾 New expense', planned: 0, actual: 0 });
  if (type === 'debt') seed.debt.push({ debt: '💳 New debt', balance: 0, payment: 0, apr: 0 });
  if (type === 'asset') seed.assets.push({ asset: '🏦 New asset', value: 0 });
  if (type === 'liability') seed.liabilities.push({ liability: '📉 New liability', value: 0 });
  renderAll();
}

document.querySelectorAll('button[data-add]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    addRow(btn.dataset.add);
  });
});

// -----------------------------
// Magic Add
// -----------------------------
const magicInput = document.getElementById('magicAddInput');
const magicBtn = document.getElementById('magicAddBtn');
const magicStatus = document.getElementById('magicAddStatus');

const CATEGORY_RULES = [
  // FIXED
  { table: 'fixed', label: '🏠 Rent', keywords: ['rent', 'landlord', 'mortgage'] },
  { table: 'fixed', label: '📱 Phone', keywords: ['phone', 'cell', 'mobile'] },
  { table: 'fixed', label: '🌐 Internet', keywords: ['internet', 'wifi'] },
  { table: 'fixed', label: '💡 Electricity', keywords: ['electric', 'electricity', 'power'] },
  { table: 'fixed', label: '🚰 Water', keywords: ['water'] },
  { table: 'fixed', label: '🛡️ Insurance', keywords: ['insurance'] },
  { table: 'fixed', label: '🏋️ Gym', keywords: ['gym'] },
  { table: 'fixed', label: '🎬 Subscriptions', keywords: ['netflix', 'spotify', 'subscription', 'subscriptions'] },

  // VARIABLE
  { table: 'variable', label: '🛒 Groceries', keywords: ['grocery', 'groceries', 'supermarket'] },
  { table: 'variable', label: '🍔 Food', keywords: ['food', 'dinner', 'lunch', 'breakfast', 'restaurant', 'eat'] },
  { table: 'variable', label: '☕ Coffee', keywords: ['coffee', 'cafe'] },
  { table: 'variable', label: '⛽ Gas', keywords: ['gas', 'fuel', 'petrol'] },
  { table: 'variable', label: '🚗 Transport', keywords: ['uber', 'taxi', 'bus', 'train', 'transport', 'ride'] },
  { table: 'variable', label: '🧴 Toiletries', keywords: ['soap', 'shampoo', 'toiletries'] },
  { table: 'variable', label: '🧠 Health', keywords: ['doctor', 'pharmacy', 'medicine', 'health'] },

  // INCOME
  { table: 'income', label: '💼 Salary', keywords: ['salary', 'paycheck', 'paycheque', 'wage', 'wages', 'pay'] },
  { table: 'income', label: '🎁 Bonus', keywords: ['bonus'] },
  { table: 'income', label: '🧾 Refund', keywords: ['refund', 'reimbursement'] },
  { table: 'income', label: '🧰 Side work', keywords: ['freelance', 'side', 'gig', 'contract'] },
  { table: 'income', label: '📈 Interest', keywords: ['interest', 'dividend'] },
];

const INCOME_HINTS = ['income', 'got paid', 'paid me', 'received', 'deposit'];
const BUDGET_HINTS = ['budget', 'plan', 'planned', 'expect', 'expected'];
const SPENT_HINTS = ['spent', 'paid', 'bought', 'for', 'charge', 'charged'];

function parseAmount(raw) {
  const s = String(raw || '')
    .replace(/[$€£₪]/g, '')
    .replace(/,/g, ' ')
    .trim();

  // supports: 50, 50.5, 2k, 1.2k, 3m
  const m = s.match(/(-?\d+(?:\.\d+)?)(\s*[kKmM])?/);
  if (!m) return null;
  let val = parseFloat(m[1]);
  if (!Number.isFinite(val)) return null;
  const suffix = (m[2] || '').trim().toLowerCase();
  if (suffix === 'k') val *= 1000;
  if (suffix === 'm') val *= 1000000;
  return val;
}

function pickRule(text) {
  const t = normalizeName(text);
  return CATEGORY_RULES.find(r => r.keywords.some(k => t.includes(k)));
}

function includesAny(text, list) {
  const t = normalizeName(text);
  return list.some(k => t.includes(normalizeName(k)));
}

function upsertByName(arr, key, name) {
  const nn = normalizeName(name);
  return arr.find(r => normalizeName(r[key]) === nn);
}

function magicAdd(raw) {
  const amount = parseAmount(raw);
  if (amount === null) {
    return { ok: false, msg: 'Type an amount, like: 50 gas or 2000 salary' };
  }

  const rule = pickRule(raw);
  const isIncome = rule?.table === 'income' || includesAny(raw, INCOME_HINTS);

  const isBudget = includesAny(raw, BUDGET_HINTS);
  const isSpent = includesAny(raw, SPENT_HINTS) || !isBudget;

  if (isIncome) {
    const label = rule?.label || '💰 Income';
    const row = upsertByName(seed.income, 'source', label);
    const r = row || { source: label, planned: 0, actual: 0 };

    if (!row) seed.income.push(r);

    if (isBudget && !isSpent) r.planned += amount;
    else r.actual += amount;

    if (r.planned <= 0) r.planned = Math.max(r.actual, 0);

    return { ok: true, msg: `Added ${money(amount)} to ${label} (Income)` };
  }

  // Expense
  const table = rule?.table || 'variable';
  const label = rule?.label || '🧾 Other';
  const list = table === 'fixed' ? seed.fixed : seed.variable;

  const row = upsertByName(list, 'category', label);
  const r = row || { category: label, planned: 0, actual: 0 };
  if (!row) list.push(r);

  // default behavior is "spent" (actual). If user explicitly says budget/plan, update planned.
  if (isBudget && !isSpent) r.planned += amount;
  else r.actual += amount;

  // If this is a brand new row and planned is empty, assume planned = actual so the traffic light isn't instantly red.
  if (r.planned <= 0) r.planned = Math.max(r.actual, amount);

  return { ok: true, msg: `Added ${money(amount)} to ${label} (${table === 'fixed' ? 'Bills' : 'Daily'})` };
}

function setMagicStatus(ok, msg) {
  if (!magicStatus) return;
  magicStatus.textContent = msg || '';
  magicStatus.className = `magic-status ${ok ? 'good' : 'bad'}`;
}

function wireMagicAdd() {
  if (!magicInput || !magicBtn) return;

  const doAdd = () => {
    const raw = magicInput.value.trim();
    if (!raw) return;
    const res = magicAdd(raw);
    setMagicStatus(res.ok, res.msg);
    if (res.ok) {
      magicInput.value = '';
      renderAll();
      magicInput.focus();
    }
  };

  magicBtn.addEventListener('click', (e) => {
    e.preventDefault();
    doAdd();
  });

  magicInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doAdd();
    }
  });
}

wireMagicAdd();

// -----------------------------
// Charts + KPIs
// -----------------------------
let spendingMixChart, topExpensesChart, expensePieChart, budgetVsActualChart, netWorthPieChart;
Chart.defaults.animation = false;
Chart.defaults.responsive = true;

function upsertChart(chartRef, canvasId, config) {
  if (chartRef) {
    chartRef.data = config.data;
    chartRef.options = config.options || {};
    chartRef.update('none');
    return chartRef;
  }
  return new Chart(document.getElementById(canvasId), config);
}

function daysInMonth(year, monthIndex0) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function recalc() {
  const income = seed.income.reduce((a, r) => a + n(r.actual), 0);
  const fixed = seed.fixed.reduce((a, r) => a + n(r.actual), 0);
  const variable = seed.variable.reduce((a, r) => a + n(r.actual), 0);
  const expenses = fixed + variable;
  const cashflow = income - expenses;
  const savingsRate = income ? Math.max(0, (cashflow / income) * 100) : 0;
  const debtPayments = seed.debt.reduce((a, r) => a + n(r.payment), 0);
  const dti = income ? (debtPayments / income) * 100 : 0;
  const efund = seed.savings.find((g) => String(g.goal).toLowerCase().includes('emergency'));
  const monthlyNeed = fixed + variable;
  const emergencyMonths = efund && monthlyNeed ? n(efund.current) / monthlyNeed : 0;
  const assets = seed.assets.reduce((a, r) => a + n(r.value), 0);
  const liabilities = seed.liabilities.reduce((a, r) => a + n(r.value), 0);
  const netWorth = assets - liabilities;
  const target = seed.savings.reduce((a, r) => a + n(r.target), 0);
  const current = seed.savings.reduce((a, r) => a + n(r.current), 0);
  const goalProgress = target ? (current / target) * 100 : 0;

  document.getElementById('kpiIncome').textContent = money(income);
  document.getElementById('kpiExpenses').textContent = money(expenses);
  const cashEl = document.getElementById('kpiCashflow');
  cashEl.textContent = money(cashflow);
  cashEl.className = cashflow >= 0 ? 'pos' : 'neg';
  document.getElementById('kpiSavingsRate').textContent = pct(savingsRate);
  document.getElementById('kpiDti').textContent = pct(dti);
  document.getElementById('kpiEmergency').textContent = `${emergencyMonths.toFixed(1)} months`;
  const netEl = document.getElementById('kpiNetWorth');
  netEl.textContent = money(netWorth);
  netEl.className = netWorth >= 0 ? 'pos' : 'neg';
  document.getElementById('kpiGoal').textContent = pct(goalProgress);

  // Today’s Budget (based on remaining planned monthly expenses)
  const plannedFixed = seed.fixed.reduce((a, r) => a + n(r.planned), 0);
  const plannedVariable = seed.variable.reduce((a, r) => a + n(r.planned), 0);
  const plannedTotal = plannedFixed + plannedVariable;
  const remaining = plannedTotal - expenses;

  const ym = String(monthInput.value || '').split('-');
  const y = parseInt(ym[0] || '0', 10);
  const m0 = (parseInt(ym[1] || '1', 10) - 1);
  const dim = daysInMonth(y || new Date().getFullYear(), Number.isFinite(m0) ? m0 : new Date().getMonth());

  const now = new Date();
  const selectedIsCurrent = y === now.getFullYear() && m0 === now.getMonth();
  const day = selectedIsCurrent ? now.getDate() : 1;
  const daysLeft = Math.max(1, dim - day + 1);
  const todayBudget = remaining / daysLeft;

  const todayEl = document.getElementById('kpiTodayBudget');
  const todaySubEl = document.getElementById('kpiTodayBudgetSub');
  if (todayEl) {
    todayEl.textContent = money(todayBudget);
    todayEl.className = `today-budget ${todayBudget >= 0 ? 'pos' : 'neg'}`;
  }
  if (todaySubEl) {
    todaySubEl.textContent = `Remaining: ${money(remaining)} • Days left: ${daysLeft}`;
  }

  spendingMixChart = upsertChart(spendingMixChart, 'spendingMix', {
    type: 'doughnut',
    data: {
      labels: ['Fixed expenses', 'Variable expenses', 'Remaining cash'],
      datasets: [{
        data: [fixed, variable, Math.max(cashflow, 0)],
        backgroundColor: ['#f87171', '#ef4444', '#10b981'],
        borderColor: 'rgba(255,255,255,.6)',
        borderWidth: 2
      }]
    },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });

  const allExpenseRows = [...seed.fixed, ...seed.variable]
    .map(r => ({ category: r.category, actual: n(r.actual) }))
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 8);

  topExpensesChart = upsertChart(topExpensesChart, 'topExpenses', {
    type: 'bar',
    data: {
      labels: allExpenseRows.map(r => r.category),
      datasets: [{
        label: 'Actual',
        data: allExpenseRows.map(r => r.actual),
        backgroundColor: 'rgba(239,68,68,.75)',
        borderColor: 'rgba(239,68,68,1)',
        borderWidth: 1,
        borderRadius: 10
      }]
    },
    options: { maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }
  });

  expensePieChart = upsertChart(expensePieChart, 'expensePie', {
    type: 'pie',
    data: {
      labels: allExpenseRows.map(r => r.category),
      datasets: [{
        data: allExpenseRows.map(r => r.actual),
        backgroundColor: [
          'rgba(239,68,68,.85)',
          'rgba(248,113,113,.82)',
          'rgba(251,146,60,.80)',
          'rgba(239,68,68,.70)',
          'rgba(248,113,113,.68)',
          'rgba(251,146,60,.66)',
          'rgba(239,68,68,.58)',
          'rgba(248,113,113,.56)'
        ],
        borderColor: 'rgba(255,255,255,.65)',
        borderWidth: 2
      }]
    },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });

  budgetVsActualChart = upsertChart(budgetVsActualChart, 'budgetVsActual', {
    type: 'bar',
    data: {
      labels: ['Fixed', 'Variable', 'Total'],
      datasets: [
        {
          label: 'Planned',
          data: [plannedFixed, plannedVariable, plannedTotal],
          backgroundColor: 'rgba(47,107,255,.55)',
          borderColor: 'rgba(47,107,255,1)',
          borderWidth: 1,
          borderRadius: 10
        },
        {
          label: 'Actual',
          data: [fixed, variable, expenses],
          backgroundColor: 'rgba(239,68,68,.70)',
          borderColor: 'rgba(239,68,68,1)',
          borderWidth: 1,
          borderRadius: 10
        }
      ]
    },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });

  netWorthPieChart = upsertChart(netWorthPieChart, 'netWorthPie', {
    type: 'pie',
    data: {
      labels: ['Assets', 'Liabilities'],
      datasets: [{
        data: [Math.max(assets, 0), Math.max(liabilities, 0)],
        backgroundColor: ['rgba(16,185,129,.85)', 'rgba(239,68,68,.75)'],
        borderColor: 'rgba(255,255,255,.65)',
        borderWidth: 2
      }]
    },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
}

function renderAll() {
  renderTable('incomeTable', seed.income, [
    { key: 'source', label: 'Income' },
    { key: 'planned', label: 'Budget', type: 'number' },
    { key: 'actual', label: 'Received', type: 'number' }
  ], { deletable: true });

  renderTable('savingsTable', seed.savings, [
    { key: 'goal', label: 'Goal' },
    { key: 'target', label: 'Goal $', type: 'number' },
    { key: 'current', label: 'Saved $', type: 'number' }
  ], { deletable: true });

  renderTable('fixedTable', seed.fixed, [
    { key: 'category', label: 'Item' },
    { key: 'planned', label: 'Budget', type: 'number' },
    { key: 'actual', label: 'Spent', type: 'number' }
  ], { deletable: true, trafficLight: true });

  renderTable('variableTable', seed.variable, [
    { key: 'category', label: 'Item' },
    { key: 'planned', label: 'Budget', type: 'number' },
    { key: 'actual', label: 'Spent', type: 'number' }
  ], { deletable: true, trafficLight: true });

  renderTable('debtTable', seed.debt, [
    { key: 'debt', label: 'Debt' },
    { key: 'balance', label: 'Balance', type: 'number' },
    { key: 'payment', label: 'Monthly Payment', type: 'number' },
    { key: 'apr', label: 'APR %', type: 'number' }
  ]);

  renderTable('assetsTable', seed.assets, [
    { key: 'asset', label: 'Asset' },
    { key: 'value', label: 'Value', type: 'number' }
  ]);

  renderTable('liabilitiesTable', seed.liabilities, [
    { key: 'liability', label: 'Liability' },
    { key: 'value', label: 'Value', type: 'number' }
  ]);

  recalc();
}

renderAll();
