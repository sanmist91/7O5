import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js';
import {
  getFirestore, collection, doc, setDoc, addDoc, deleteDoc,
  query, where, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js';

// ── Firebase config ──────────────────────────────────────
const _cfg = {
  apiKey:            'AIzaSyDGZDE6_dcR1SAPZxys2aeXFDwCZ5qC4l0',
  authDomain:        'club7o5.firebaseapp.com',
  projectId:         'club7o5',
  storageBucket:     'club7o5.firebasestorage.app',
  messagingSenderId: '1049265598960',
  appId:             '1:1049265598960:web:d51a48848c840a1600ed35',
};
const db = getFirestore(initializeApp(_cfg));

// ── Utils ────────────────────────────────────────────────
const toYMD = d => d.toISOString().slice(0, 10);
const toYM  = d => d.toISOString().slice(0, 7);

function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return new Date(+y, +m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
function shiftMonth(ym, d) {
  const [y, m] = ym.split('-').map(Number);
  const nd = new Date(y, m - 1 + d, 1);
  return toYM(nd);
}
function daysInMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}
function dayLabel(ymd) {
  return new Date(ymd + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
function formatRupees(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Members ──────────────────────────────────────────────
const MEMBERS = ['NK','HK','Ronak','Mota','Punit','Dr Nimesh','SKD','Nachi','Viren','Kapoor','Sanket','Paji','Vishal'];

// ── Firestore CRUD ───────────────────────────────────────
const setDailyLog   = (date, count) =>
  setDoc(doc(db, 'dailyLogs', date), { date, count, updatedAt: serverTimestamp() });

const addPayment    = p => addDoc(collection(db, 'payments'), p);
const removePayment = id => deleteDoc(doc(db, 'payments', id));
const saveSetting   = s => setDoc(doc(db, 'monthSettings', s.month), s);

// ── State ────────────────────────────────────────────────
const NOW      = new Date();
const TODAY    = toYMD(NOW);
const CUR_MON  = toYM(NOW);

const S = {
  tab:        'home',
  homeMonth:  CUR_MON,
  logMonth:   CUR_MON,
  payMonth:   CUR_MON,
  logs:       [],
  payments:   [],
  setting:    null,
  saving:     false,
};

let homeSubs = [], logSubs = [], paySubs = [];

const unsub = arr => { arr.forEach(f => f()); arr.length = 0; };

// ── Tab switching ────────────────────────────────────────
window.switchTab = function(tab) {
  S.tab = tab;
  document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
  document.getElementById('screen-' + tab).classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  if (tab === 'home')     startHome(S.homeMonth);
  if (tab === 'log')      startLog(S.logMonth);
  if (tab === 'payments') startPay(S.payMonth);
};

// ── Home ─────────────────────────────────────────────────
function startHome(month) {
  unsub(homeSubs);
  const q1 = query(collection(db, 'dailyLogs'), where('date', '>=', month+'-01'), where('date', '<=', month+'-31'));
  const q2 = query(collection(db, 'payments'), where('month', '==', month));
  const q3 = doc(db, 'monthSettings', month);
  homeSubs.push(
    onSnapshot(q1, snap => { S.logs = snap.docs.map(d => d.data()); renderHome(); }),
    onSnapshot(q2, snap => { S.payments = snap.docs.map(d => ({id: d.id, ...d.data()})); renderHome(); }),
    onSnapshot(q3, snap => { S.setting = snap.exists() ? snap.data() : null; renderHome(); })
  );
}

function renderHome() {
  const logs    = S.logs;
  const todayLg = logs.find(l => l.date === TODAY);
  const cups    = todayLg?.count ?? 0;
  const total   = logs.reduce((s, l) => s + l.count, 0);
  const cost    = total * 20;
  const ob      = S.setting?.openingBalance ?? 0;
  const cred    = S.payments.reduce((s, p) => s + p.amount, 0) + ob;
  const bal     = cred - cost;
  const avg     = logs.length ? (total / logs.length).toFixed(1) : '—';

  document.getElementById('screen-home').innerHTML = `
    <div class="page-hdr">
      <div>
        <div class="page-title">Club 7o5 ☀️</div>
        <div class="page-month">${monthLabel(S.homeMonth)}</div>
      </div>
    </div>

    <div class="balance-card">
      <div class="bal-lbl">Monthly Balance</div>
      <div class="bal-amount${bal < 0 ? ' neg' : ''}">${formatRupees(bal)}</div>
      <div class="bal-row">
        <div class="bal-stat">
          <div class="bal-stat-lbl">Credited</div>
          <div class="bal-stat-val">${formatRupees(cred)}</div>
        </div>
        <div class="bal-divider"></div>
        <div class="bal-stat">
          <div class="bal-stat-lbl">Spent</div>
          <div class="bal-stat-val">${formatRupees(cost)}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-hdr">
        <div class="card-title">Today's Tea</div>
        ${S.saving ? '<span class="dot"></span>' : ''}
      </div>
      <div class="today-date">${NOW.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</div>
      <div class="counter">
        <button class="cnt-btn" onclick="stepCups(-0.5)" ${cups===0||S.saving?'disabled':''}>−</button>
        <div>
          <div class="cnt-val">${cups}</div>
          <div class="cnt-unit">cups</div>
        </div>
        <button class="cnt-btn add" onclick="stepCups(0.5)" ${S.saving?'disabled':''}>+</button>
      </div>
      <div class="cnt-hint">Each tap = ½ cup · Today's cost: ${formatRupees(cups*20)}</div>
    </div>

    <div class="card">
      <div class="card-title" style="margin-bottom:0">This Month's Stats</div>
      <div class="stats-grid">
        <div class="stat-box"><div class="stat-val">${total}</div><div class="stat-lbl">Total Teas</div></div>
        <div class="stat-box"><div class="stat-val">${formatRupees(cost)}</div><div class="stat-lbl">Total Cost</div></div>
        <div class="stat-box"><div class="stat-val">${logs.length}</div><div class="stat-lbl">Days Logged</div></div>
        <div class="stat-box"><div class="stat-val">${avg}</div><div class="stat-lbl">Avg / Day</div></div>
      </div>
    </div>`;
}

window.stepCups = async function(delta) {
  if (S.saving) return;
  const cur = S.logs.find(l => l.date === TODAY)?.count ?? 0;
  const next = Math.max(0, Math.round((cur + delta) * 2) / 2);
  S.saving = true; renderHome();
  try { await setDailyLog(TODAY, next); }
  catch { alert('Failed to save. Check your connection.'); }
  finally { S.saving = false; renderHome(); }
};

// ── Daily Log ────────────────────────────────────────────
function startLog(month) {
  unsub(logSubs);
  const q = query(collection(db, 'dailyLogs'), where('date', '>=', month+'-01'), where('date', '<=', month+'-31'));
  let map = {};
  logSubs.push(onSnapshot(q, snap => {
    map = {};
    snap.docs.forEach(d => { map[d.data().date] = d.data().count; });
    renderLog(map, month);
  }));
}

function renderLog(map, month) {
  const days  = daysInMonth(month);
  const [y,m] = month.split('-').map(Number);
  const isCur = month === CUR_MON;
  let rows = '';
  for (let d = 1; d <= days; d++) {
    const ds  = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cnt = map[ds] ?? 0;
    const isT = ds === TODAY;
    const wday = new Date(ds+'T00:00:00').toLocaleDateString('en-IN', {weekday:'short'});
    const dlbl = new Date(ds+'T00:00:00').toLocaleDateString('en-IN', {day:'numeric', month:'short'});
    rows += `
      <div class="log-row${isT?' today':''}" onclick="editLog('${ds}',${cnt})">
        <div class="log-info">
          <div class="log-day-name">${isT ? 'Today ▶' : wday}</div>
          <div class="log-day-date">${dlbl}</div>
        </div>
        <div class="log-badge${cnt===0?' empty':''}">${cnt > 0 ? cnt+' ☕' : '—'}</div>
      </div>`;
  }
  document.getElementById('screen-log').innerHTML = `
    <div class="month-nav">
      <button class="mnav-btn" onclick="shiftLog(-1)">‹</button>
      <div class="mnav-center">
        <div class="mnav-label">${monthLabel(month)}</div>
        <div class="mnav-sub">Daily Log</div>
      </div>
      <button class="mnav-btn" onclick="shiftLog(1)" ${isCur?'disabled':''}>›</button>
    </div>
    ${rows}`;
}

window.shiftLog = function(d) { S.logMonth = shiftMonth(S.logMonth, d); startLog(S.logMonth); };

window.editLog = function(date, cur) {
  const lbl = new Date(date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'});
  showModal(`
    <div class="modal-title">Edit Tea Count</div>
    <div class="modal-subtitle">${lbl}</div>
    <div class="modal-label">Cups (0.5 increments)</div>
    <input class="modal-input" id="mi-count" type="number" value="${cur}" min="0" step="0.5" inputmode="decimal">
    <div class="modal-actions">
      <button class="modal-cancel" onclick="closeModal()">Cancel</button>
      <button class="modal-save" id="mi-save" onclick="saveLog('${date}')">Save</button>
    </div>`);
  setTimeout(() => document.getElementById('mi-count')?.select(), 80);
};

window.saveLog = async function(date) {
  const v = parseFloat(document.getElementById('mi-count').value);
  if (isNaN(v) || v < 0) { alert('Enter a valid number.'); return; }
  const btn = document.getElementById('mi-save');
  btn.disabled = true; btn.textContent = 'Saving…';
  try { await setDailyLog(date, v); closeModal(); }
  catch { alert('Failed to save.'); btn.disabled = false; btn.textContent = 'Save'; }
};

// ── Payments ─────────────────────────────────────────────
let _pData = [], _pSet = null;

function startPay(month) {
  unsub(paySubs);
  _pData = []; _pSet = null;
  const q = query(collection(db, 'payments'), where('month', '==', month));
  paySubs.push(
    onSnapshot(q, snap => {
      _pData = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.date.localeCompare(b.date));
      renderPay();
    }),
    onSnapshot(doc(db, 'monthSettings', month), snap => {
      _pSet = snap.exists() ? snap.data() : null;
      renderPay();
    })
  );
}

function renderPay() {
  const month = S.payMonth;
  const isCur = month === CUR_MON;
  const ob    = _pSet?.openingBalance ?? 0;
  const nc    = _pData.reduce((s,p)=>s+p.amount, 0);
  const tot   = nc + ob;

  let rows = _pData.length === 0
    ? `<div class="empty-state"><div class="empty-icon">💰</div><div class="empty-title">No payments recorded yet</div><div class="empty-sub">Tap "Add" to record a credit</div></div>`
    : _pData.map(p => `
      <div class="pay-row">
        <div class="pay-avatar">${esc(p.name.charAt(0).toUpperCase())}</div>
        <div class="pay-info">
          <div class="pay-name">${esc(p.name)}</div>
          <div class="pay-date">${dayLabel(p.date)}</div>
        </div>
        <div class="pay-right">
          <div class="pay-amt">${formatRupees(p.amount)}</div>
          <button class="del-btn" onclick="delPay('${p.id}','${esc(p.name)}',${p.amount})">🗑</button>
        </div>
      </div>`).join('');

  document.getElementById('screen-payments').innerHTML = `
    <div class="month-nav">
      <button class="mnav-btn" onclick="shiftPay(-1)">‹</button>
      <div class="mnav-center">
        <div class="mnav-label">${monthLabel(month)}</div>
        <div class="mnav-sub">Payments & Credits</div>
      </div>
      <button class="mnav-btn" onclick="shiftPay(1)" ${isCur?'disabled':''}>›</button>
    </div>
    <div class="sum-card">
      <div class="sum-row">
        <div class="sum-item">
          <div class="sum-lbl">Opening Balance</div>
          <div style="display:flex;align-items:center;gap:6px">
            <div class="sum-val">${formatRupees(ob)}</div>
            <button class="sum-edit" onclick="editOpening(${ob})">✏️</button>
          </div>
        </div>
        <div class="sum-divider"></div>
        <div class="sum-item">
          <div class="sum-lbl">New Credits</div>
          <div class="sum-val">${formatRupees(nc)}</div>
        </div>
      </div>
      <div class="sum-total">
        <span class="sum-total-lbl">Total Credited</span>
        <span class="sum-total-val">${formatRupees(tot)}</span>
      </div>
    </div>
    <div class="sec-hdr">
      <div class="sec-title">Credit Entries</div>
      <button class="add-btn" onclick="openAddPay()">+ Add</button>
    </div>
    ${rows}`;
}

window.shiftPay  = d => { S.payMonth = shiftMonth(S.payMonth, d); startPay(S.payMonth); };

window.openAddPay = () => {
  const chips = [...MEMBERS, 'Other…'].map(m =>
    `<button class="member-chip" onclick="selectMember(this,'${m}')">${m}</button>`
  ).join('');
  showModal(`
    <div class="modal-title">Add Credit</div>
    <div class="modal-subtitle">Tap a name · enter amount · save</div>
    <div class="member-chips">${chips}</div>
    <input id="mi-name" type="hidden" value="">
    <div id="mi-other-wrap" style="display:none">
      <div class="modal-label">Name</div>
      <input class="modal-input" id="mi-name-text" type="text" placeholder="Enter name" autocomplete="off">
    </div>
    <div class="modal-label">Amount (₹)</div>
    <input class="modal-input" id="mi-amt" type="number" placeholder="e.g. 500" inputmode="numeric">
    <div class="modal-actions">
      <button class="modal-cancel" onclick="closeModal()">Cancel</button>
      <button class="modal-save" id="mi-save" onclick="savePay()">Add</button>
    </div>`);
};

window.selectMember = (el, name) => {
  document.querySelectorAll('.member-chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  const wrap = document.getElementById('mi-other-wrap');
  if (name === 'Other…') {
    wrap.style.display = 'block';
    document.getElementById('mi-name').value = '';
    setTimeout(() => document.getElementById('mi-name-text')?.focus(), 50);
  } else {
    wrap.style.display = 'none';
    document.getElementById('mi-name').value = name;
    setTimeout(() => document.getElementById('mi-amt')?.focus(), 50);
  }
};

window.savePay = async () => {
  let name = document.getElementById('mi-name')?.value.trim();
  if (!name) name = document.getElementById('mi-name-text')?.value.trim() || '';
  const amt = parseFloat(document.getElementById('mi-amt')?.value);
  if (!name)              { alert('Select a member or enter a name.'); return; }
  if (isNaN(amt)||amt<=0) { alert('Enter a valid amount.'); return; }
  const btn = document.getElementById('mi-save');
  btn.disabled = true; btn.textContent = 'Saving…';
  try { await addPayment({ name, amount: amt, date: TODAY, month: S.payMonth }); closeModal(); }
  catch { alert('Failed to save.'); btn.disabled = false; btn.textContent = 'Add'; }
};

window.delPay = (id, name, amt) => {
  if (confirm(`Remove ${name}'s payment of ${formatRupees(amt)}?`))
    removePayment(id).catch(() => alert('Failed to delete.'));
};

window.editOpening = ob => {
  showModal(`
    <div class="modal-title">Opening Balance</div>
    <div class="modal-subtitle">Balance carried over from last month</div>
    <input class="modal-input" id="mi-ob" type="number" value="${ob}" inputmode="decimal">
    <div class="modal-actions">
      <button class="modal-cancel" onclick="closeModal()">Cancel</button>
      <button class="modal-save" id="mi-save" onclick="saveOpening()">Save</button>
    </div>`);
  setTimeout(() => document.getElementById('mi-ob')?.select(), 80);
};

window.saveOpening = async () => {
  const v = parseFloat(document.getElementById('mi-ob').value);
  if (isNaN(v)||v<0) { alert('Enter a valid amount.'); return; }
  const btn = document.getElementById('mi-save');
  btn.disabled = true; btn.textContent = 'Saving…';
  try { await saveSetting({ month: S.payMonth, openingBalance: v, pricePerTea: 20 }); closeModal(); }
  catch { alert('Failed to save.'); btn.disabled = false; btn.textContent = 'Save'; }
};

// ── Modal ────────────────────────────────────────────────
function showModal(html) {
  document.getElementById('modal-card').innerHTML = html;
  document.getElementById('modal').classList.remove('hidden');
}
window.closeModal   = () => document.getElementById('modal').classList.add('hidden');
window.bgClose      = e => { if (e.target.id === 'modal') closeModal(); };

// ── Boot ─────────────────────────────────────────────────
startHome(S.homeMonth);
