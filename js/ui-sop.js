/* ============================================================
   ui-sop.js — diagnostic step-through (the guided SOP)
   Walks the decision tree built from the current board.
   ============================================================ */
import { $ } from './utils.js';
import { state } from './state.js';
import { buildDiag, buildDiagForComponent } from './diagnostic.js';
import { highlight } from './ar-hotspots.js';
import { openInfo } from './ui-info.js';

let diag = {}, node = 'start';

export function initSOP() {
  // The old "Start Diagnosis" button (walked every component) is gone — tapping a
  // point now opens that one component's steps. Keep restart wired just in case.
  const r = $('sopRestart');
  if (r) r.addEventListener('click', () => { node = 'start'; render(); });
}

// Tap a hotspot → diagnose ONLY that component (its question, then its fix).
export function openSOPFor(cid) {
  const c = (state.board?.components || []).find(x => x.id === cid);
  if (!c) return;
  diag = buildDiagForComponent(c); node = 'start'; render();
  highlight(cid);
  $('sop').classList.remove('hidden');
}

function render() {
  const n = diag[node]; if (!n) return;
  const btns = $('sopBtns'); btns.innerHTML = '';
  if (n.fix) {
    $('sopQ').innerHTML = '🔧 ' + n.fix;
    if (n.focus) highlight(n.focus);
    const done = document.createElement('button');
    done.className = 'sop-opt'; done.textContent = '✓ Done';
    done.onclick = () => { $('sop').classList.add('hidden'); if (n.focus) openInfo(n.focus); };
    btns.appendChild(done);
  } else {
    $('sopQ').textContent = n.q;
    (n.options || []).forEach(o => {
      const b = document.createElement('button'); b.className = 'sop-opt'; b.textContent = o.label;
      b.onclick = () => { node = o.go; render(); }; btns.appendChild(b);
    });
  }
}
