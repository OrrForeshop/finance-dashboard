const seed = {
  income: [
    { source: 'Paycheck', planned: 5000, actual: 5000 },
    { source: 'Side work', planned: 300, actual: 250 },
  ],
  savings: [
    { goal: 'Emergency fund', target: 12000, current: 4500 },
    { goal: 'Vacation', target: 3000, current: 900 },
  ],
  // Prefilled with 4 obvious examples (requested): Rent, Groceries, Phone Bill, Transport
  fixed: [
    { category: 'Rent', planned: 1500, actual: 1500 },
    { category: 'Phone Bill', planned: 60, actual: 60 },
  ],
  variable: [
    { category: 'Groceries', planned: 500, actual: 470 },
    { category: 'Transport', planned: 180, actual: 210 },
  ],
  debt: [
    { debt: 'Credit Card', balance: 2500, payment: 180, apr: 19 },
    { debt: 'Car Loan', balance: 9800, payment: 250, apr: 6.2 },
  ],
  assets: [
    { asset: 'Cash & Bank', value: 6200 },
    { asset: 'Investments', value: 14500 },
  ],
  liabilities: [
    { liability: 'Credit Card Balance', value: 2500 },
    { liability: 'Car Loan Balance', value: 9800 },
  ]
};

const monthInput = document.getElementById('month');
monthInput.value = new Date().toISOString().slice(0, 7);

function n(v) {
  const x = parseFloat(v);
  return Number.isFinite(x) ? x : 0;
}
function money(v) { return `$${n(v).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`; }
function pct(v) { return `${n(v).toFixed(1)}%`; }

function renderTable(tableId, rows, fields, opts = {}) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = '';

  rows.forEach((row, i) => {
    const tr = document.createElement('tr');

    fields.forEach((f) => {
      const td = document.createElement('td');
      td.dataset.label = f.label || f.key;

      const input = document.createElement('input');
      input.value = row[f.key] ?? '';
      input.type = f.type || 'text';
      input.inputMode = f.type === 'number' ? 'decimal' : 'text';

      input.addEventListener('input', (e) => {
        row[f.key] = f.type === 'number' ? n(e.target.value) : e.target.value;
        recalc();
      });

      td.appendChild(input);
      tr.appendChild(td);
    });

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
  if (type === 'income') seed.income.push({ source: 'New income', planned: 0, actual: 0 });
  if (type === 'savings') seed.savings.push({ goal: 'New goal', target: 0, current: 0 });
  if (type === 'fixed') seed.fixed.push({ category: 'New fixed expense', planned: 0, actual: 0 });
  if (type === 'variable') seed.variable.push({ category: 'New variable expense', planned: 0, actual: 0 });
  if (type === 'debt') seed.debt.push({ debt: 'New debt', balance: 0, payment: 0, apr: 0 });
  if (type === 'asset') seed.assets.push({ asset: 'New asset', value: 0 });
  if (type === 'liability') seed.liabilities.push({ liability: 'New liability', value: 0 });
  renderAll();
}

document.querySelectorAll('button[data-add]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    addRow(btn.dataset.add);
  });
});

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

function recalc() {
  const income = seed.income.reduce((a, r) => a + n(r.actual), 0);
  const fixed = seed.fixed.reduce((a, r) => a + n(r.actual), 0);
  const variable = seed.variable.reduce((a, r) => a + n(r.actual), 0);
  const expenses = fixed + variable;
  const cashflow = income - expenses;
  const savingsRate = income ? Math.max(0, (cashflow / income) * 100) : 0;
  const debtPayments = seed.debt.reduce((a, r) => a + n(r.payment), 0);
  const dti = income ? (debtPayments / income) * 100 : 0;
  const efund = seed.savings.find((g) => g.goal.toLowerCase().includes('emergency'));
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

  spendingMixChart = upsertChart(spendingMixChart, 'spendingMix', {
    type: 'doughnut',
    data: {
      labels: ['Fixed expenses', 'Variable expenses', 'Remaining cash'],
      datasets: [{ data: [fixed, variable, Math.max(cashflow, 0)], backgroundColor: ['#bda9d7', '#9f87c2', '#d8c8ea'] }]
    },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });

  const allExpenseRows = [...seed.fixed, ...seed.variable].map(r => ({
    category: r.category,
    actual: n(r.actual)
  })).sort((a,b) => b.actual-a.actual).slice(0, 8);

  topExpensesChart = upsertChart(topExpensesChart, 'topExpenses', {
    type: 'bar',
    data: {
      labels: allExpenseRows.map(r => r.category),
      datasets: [{ label: 'Actual', data: allExpenseRows.map(r => r.actual), backgroundColor: '#bda9d7' }]
    },
    options: { maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }
  });

  expensePieChart = upsertChart(expensePieChart, 'expensePie', {
    type: 'pie',
    data: {
      labels: allExpenseRows.map(r => r.category),
      datasets: [{
        data: allExpenseRows.map(r => r.actual),
        backgroundColor: ['#bda9d7','#9f87c2','#d8c8ea','#b49ad2','#c9b7e1','#a98fc9','#ddcfee','#8f78b8']
      }]
    },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });

  const plannedFixed = seed.fixed.reduce((a, r) => a + n(r.planned), 0);
  const plannedVariable = seed.variable.reduce((a, r) => a + n(r.planned), 0);
  budgetVsActualChart = upsertChart(budgetVsActualChart, 'budgetVsActual', {
    type: 'bar',
    data: {
      labels: ['Fixed', 'Variable', 'Total'],
      datasets: [
        { label: 'Planned', data: [plannedFixed, plannedVariable, plannedFixed + plannedVariable], backgroundColor: '#d8c8ea' },
        { label: 'Actual', data: [fixed, variable, expenses], backgroundColor: '#9f87c2' }
      ]
    },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });

  netWorthPieChart = upsertChart(netWorthPieChart, 'netWorthPie', {
    type: 'pie',
    data: {
      labels: ['Assets', 'Liabilities'],
      datasets: [{ data: [Math.max(assets, 0), Math.max(liabilities, 0)], backgroundColor: ['#bda9d7', '#e0a7b8'] }]
    },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
}

function renderAll() {
  renderTable('incomeTable', seed.income, [
    { key: 'source' }, { key: 'planned', type: 'number' }, { key: 'actual', type: 'number' }
  ], { deletable: true });

  renderTable('savingsTable', seed.savings, [
    { key: 'goal' }, { key: 'target', type: 'number' }, { key: 'current', type: 'number' }
  ], { deletable: true });

  // Expenses tables (both are expenses) — deletable rows
  renderTable('fixedTable', seed.fixed, [
    { key: 'category' }, { key: 'planned', type: 'number' }, { key: 'actual', type: 'number' }
  ], { deletable: true });

  renderTable('variableTable', seed.variable, [
    { key: 'category' }, { key: 'planned', type: 'number' }, { key: 'actual', type: 'number' }
  ], { deletable: true });

  // Other tables unchanged
  renderTable('debtTable', seed.debt, [
    { key: 'debt' }, { key: 'balance', type: 'number' }, { key: 'payment', type: 'number' }, { key: 'apr', type: 'number' }
  ]);
  renderTable('assetsTable', seed.assets, [
    { key: 'asset' }, { key: 'value', type: 'number' }
  ]);
  renderTable('liabilitiesTable', seed.liabilities, [
    { key: 'liability' }, { key: 'value', type: 'number' }
  ]);
  recalc();
}

renderAll();