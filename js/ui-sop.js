/* ============================================================
   ui-sop.js — guided diagnosis
     - 🔧 Diagnose button → list of problems
     - pick one → an interactive question wizard (symptom → step checks → fix)
   ============================================================ */
import { $ } from './utils.js';
import { state } from './state.js';
import { buildDiagForComponent } from './diagnostic.js';
import { highlight } from './ar-hotspots.js';
import { openInfo } from './ui-info.js';

let diag = {}, node = 'start';

export function initSOP() {
  const b = $('diagBtn');     if (b) b.addEventListener('click', openDiagList);
  const r = $('sopRestart');  if (r) r.addEventListener('click', () => { node = 'start'; render(); });
}

// list every component/problem to choose from
function openDiagList() {
  const comps = (state.board && state.board.components) || [];
  const wrap = $('diagListItems');
  wrap.innerHTML = '';
  if (!comps.length) wrap.innerHTML = '<p class="desc">Scan a board first.</p>';
  comps.forEach(c => {
    const row = document.createElement('button');
    row.className = 'diag-row';
    row.innerHTML = '<span class="dr-name">' + c.name + '</span>' +
                    '<span class="dr-fault">' + (c.fault || '') + '</span>';
    row.onclick = () => { $('diagList').classList.add('hidden'); startWizard(c.id); };
    wrap.appendChild(row);
  });
  $('diagList').classList.remove('hidden');
}

// open the interactive question wizard for one component
function startWizard(cid) {
  const c = (state.board && state.board.components || []).find(x => x.id === cid);
  if (!c) return;
  diag = buildDiagForComponent(c);
  node = 'start';
  highlight(cid);
  render();
  $('sop').classList.remove('hidden');
}

function render() {
  const n = diag[node]; if (!n) return;
  const btns = $('sopBtns'); btns.innerHTML = '';
  if (n.fix) {
    $('sopQ').innerHTML = '🔧 Fix: ' + n.fix;
    if (n.focus) highlight(n.focus);
    const fixed = document.createElement('button');
    fixed.className = 'sop-opt'; fixed.textContent = '✓ Mark repaired';
    fixed.onclick = () => { $('sop').classList.add('hidden'); if (n.focus) openInfo(n.focus); };
    btns.appendChild(fixed);
    const close = document.createElement('button');
    close.className = 'sop-opt'; close.textContent = 'Close';
    close.onclick = () => $('sop').classList.add('hidden');
    btns.appendChild(close);
  } else {
    $('sopQ').textContent = n.q;
    (n.options || []).forEach(o => {
      const b = document.createElement('button');
      b.className = 'sop-opt'; b.textContent = o.label;
      b.onclick = () => { node = o.go; render(); };
      btns.appendChild(b);
    });
  }
}
