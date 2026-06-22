/* ============================================================
   ui-sop.js — diagnostic step-through (the guided SOP)
   Walks the decision tree built from the current board.
   ============================================================ */
import { $ } from './utils.js';
import { state } from './state.js';
import { buildDiag } from './diagnostic.js';
import { highlight } from './ar-hotspots.js';
import { openInfo } from './ui-info.js';

let diag = {}, node = 'start';

export function initSOP() {
  $('diagBtn').addEventListener('click', () => { diag = buildDiag(state.board || {}); node = 'start'; render(); $('sop').classList.remove('hidden'); });
  $('sopRestart').addEventListener('click', () => { node = 'start'; render(); });
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
