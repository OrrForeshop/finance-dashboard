// Absolute-simple finance dashboard (mobile-first)

const STORAGE_KEY = 'finance-dashboard.v2';

function todayMonth() {
  return new Date().toISOString().slice(0, 7);
}

function n(v) {
  const x = parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(x) ? x : 0;
}

function money(v) {
  const val = n(v);
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { months: {} };
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
    in: [
      { id: uid(), name: 'Salary', amount: 5000 },
    ],
    out: [
      { id: uid(), name: 'Rent', amount: 1500 },
      { id: uid(), name: 'Groceries', amount: 450 },
    ],
    savings: [
      { id: uid(), name: 'Emergency Fund', amount: 300 },
    ]
  };
}

const els = {
  month: document.getElementById('month'),
  kpiRemaining: document.getElementById('kpiRemaining'),
  kpiSaved: document.getElementById('kpiSaved'),

  listIn: document.getElementById('listIn'),
  listOut: document.getElementById('listOut'),
  listSavings: document.getElementById('listSavings'),

  addIn: document.getElementById('addIn'),
  addOut: document.getElementById('addOut'),
  addSavings: document.getElementById('addSavings'),
};

const store = loadStore();
els.month.value = todayMonth();

function getMonthState(ym) {
  if (!store.months[ym]) store.months[ym] = seedMonth();
  // normalize
  store.months[ym].in ||= [];
  store.months[ym].out ||= [];
  store.months[ym].savings ||= [];
  return store.months[ym];
}

function totals(ms) {
  const totalIn = ms.in.reduce((a, r) => a + n(r.amount), 0);
  const totalOut = ms.out.reduce((a, r) => a + n(r.amount), 0);
  const totalSaved = ms.savings.reduce((a, r) => a + n(r.amount), 0);
  const remaining = totalIn - totalOut - totalSaved;
  return { totalIn, totalOut, totalSaved, remaining };
}

function itemRow({ section, row, onChange, onDelete }) {
  const wrap = document.createElement('div');
  wrap.className = 'item';
  wrap.setAttribute('role', 'listitem');

  const fName = document.createElement('div');
  fName.className = 'field';
  const lName = document.createElement('label');
  lName.textContent = 'Name';
  const iName = document.createElement('input');
  iName.className = 'text';
  iName.type = 'text';
  iName.value = row.name ?? '';
  iName.autocomplete = 'off';
  iName.addEventListener('input', () => onChange({ ...row, name: iName.value }));
  fName.appendChild(lName);
  fName.appendChild(iName);

  const fAmt = document.createElement('div');
  fAmt.className = 'field';
  const lAmt = document.createElement('label');
  lAmt.textContent = 'Amount';
  const iAmt = document.createElement('input');
  iAmt.className = 'amount';
  iAmt.type = 'number';
  iAmt.inputMode = 'decimal';
  iAmt.step = '0.01';
  iAmt.value = row.amount ?? 0;
  iAmt.addEventListener('input', () => onChange({ ...row, amount: n(iAmt.value) }));
  fAmt.appendChild(lAmt);
  fAmt.appendChild(iAmt);

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'del';
  del.textContent = '🗑️';
  del.title = `Delete (${section})`;
  del.setAttribute('aria-label', `Delete ${section} item`);
  del.addEventListener('click', (e) => {
    e.preventDefault();
    onDelete();
  });

  wrap.appendChild(fName);
  wrap.appendChild(fAmt);
  wrap.appendChild(del);

  return wrap;
}

function render() {
  const ym = els.month.value || todayMonth();
  const ms = getMonthState(ym);

  // KPI
  const { totalSaved, remaining } = totals(ms);
  els.kpiSaved.textContent = money(totalSaved);
  els.kpiRemaining.textContent = money(remaining);
  els.kpiRemaining.classList.remove('kpi-green', 'kpi-red');
  els.kpiRemaining.classList.add(remaining >= 0 ? 'kpi-green' : 'kpi-red');

  // Lists
  const draw = (host, sectionKey, sectionLabel) => {
    host.innerHTML = '';
    ms[sectionKey].forEach((row) => {
      host.appendChild(itemRow({
        section: sectionLabel,
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

  draw(els.listIn, 'in', 'Money In');
  draw(els.listOut, 'out', 'Money Out');
  draw(els.listSavings, 'savings', 'Savings');
}

function addItem(sectionKey, defaults) {
  const ym = els.month.value || todayMonth();
  const ms = getMonthState(ym);
  ms[sectionKey].push({ id: uid(), ...defaults });
  saveStore(store);
  render();
}

els.month.addEventListener('input', () => {
  const ym = els.month.value || todayMonth();
  getMonthState(ym);
  saveStore(store);
  render();
});

els.addIn.addEventListener('click', () => addItem('in', { name: 'New income', amount: 0 }));
els.addOut.addEventListener('click', () => addItem('out', { name: 'New expense', amount: 0 }));
els.addSavings.addEventListener('click', () => addItem('savings', { name: 'New savings', amount: 0 }));

// First paint
getMonthState(els.month.value || todayMonth());
saveStore(store);
render();
