/* ============================================================
   ui-info.js — component info panel (tap a hotspot)
   ============================================================ */
import { $, toast } from './utils.js';
import { state } from './state.js';
import { setRepaired } from './ar-hotspots.js';
import { updateDash } from './ui-dashboard.js';

let curCid = null;

export function openInfo(cid) {
  const c = (state.board?.components || []).find(x => x.id === cid);
  if (!c) return;
  curCid = cid;
  $('iFault').textContent = c.fault || '';
  $('iName').textContent  = c.name || '';
  $('iDesc').textContent  = c.desc || '';
  $('iExp').textContent   = c.exp  || '—';
  $('iMeas').textContent  = c.meas || '—';
  $('iFix').textContent   = c.fix  || '';
  // numbered, scrollable steps to check this component
  const steps = (c.steps && c.steps.length) ? c.steps : [
    `Inspect ${c.name} for visible damage.`,
    `Expected: ${c.exp || '—'} — measure the actual value.`,
    `If it reads ${c.meas || 'wrong'}, ${c.fix || 'reflow or replace it.'}`
  ];
  const ol = $('iSteps'); ol.innerHTML = '';
  steps.forEach(s => { const li = document.createElement('li'); li.textContent = s; ol.appendChild(li); });
  $('markFixed').style.display = state.repaired.has(cid) ? 'none' : '';
  $('info').classList.remove('hidden');
  // show the component name as a centered label under the marker id
  const lab = $('compLabel');
  if (lab) { lab.textContent = c.name || c.id; lab.classList.remove('hidden'); }
  if (!state.faults.has(cid)) { state.faults.add(cid); updateDash(); }
}

export function initInfo() {
  $('markFixed').addEventListener('click', () => {
    if (curCid && !state.repaired.has(curCid)) {
      state.repaired.add(curCid); setRepaired(curCid); updateDash();
      toast('✓ Repair logged — e-waste avoided');
    }
    $('info').classList.add('hidden');
  });
}
