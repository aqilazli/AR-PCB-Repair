/* ============================================================
   ui-sop.js — diagnosis problem picker
     - the 🔧 Diagnose button opens a list of every component/problem
     - tap a row → opens that component's fault + step-by-step checks
   ============================================================ */
import { $ } from './utils.js';
import { state } from './state.js';
import { highlight } from './ar-hotspots.js';
import { openInfo } from './ui-info.js';

export function initSOP() {
  const b = $('diagBtn');
  if (b) b.addEventListener('click', openDiagList);
}

// Build the selectable list of problems for the current board.
function openDiagList() {
  const comps = (state.board && state.board.components) || [];
  const wrap = $('diagListItems');
  wrap.innerHTML = '';
  if (!comps.length) { wrap.innerHTML = '<p class="desc">Scan a board first.</p>'; }
  comps.forEach(c => {
    const row = document.createElement('button');
    row.className = 'diag-row';
    row.innerHTML = '<span class="dr-name">' + c.name + '</span>' +
                    '<span class="dr-fault">' + (c.fault || '') + '</span>';
    row.onclick = () => {
      $('diagList').classList.add('hidden');
      highlight(c.id);
      openInfo(c.id);          // shows fault + numbered scrollable steps
    };
    wrap.appendChild(row);
  });
  $('diagList').classList.remove('hidden');
}
