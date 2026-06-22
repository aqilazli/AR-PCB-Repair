/* ============================================================
   main.js — project-specific wiring (entry point)
     - boots the AR engine (ar-setup.js)
     - drives the UI: intro, component info, diagnostic SOP,
       impact dashboard, 3D model panel, help
   Globals used: window.COMPONENTS, window.DIAG, window.IMPACT (data.js).
   ============================================================ */
import { $, toast } from './utils.js';
import * as AR from './ar-setup.js';

const COMPONENTS = window.COMPONENTS || [];
const DIAG       = window.DIAG || {};
const IMPACT     = window.IMPACT || { ewastePerRepair:0.4, co2PerRepair:12, lifePerRepair:2 };

// ---- app state ----
let faultsFound = 0, repairsDone = 0;
const inspected = new Set(), repaired = new Set();

// ---- boot the AR scene now (no camera yet) ----
AR.initAR();
AR.onHotspotTap(openInfo);

// ---- Intro / start ----
$('startBtn').addEventListener('click', async () => {
  const ok = await AR.startCamera();
  if (!ok) return;
  $('intro').classList.add('hidden');
  $('hud').classList.remove('hidden');
  AR.startARLoop();
});
$('helpBtn').addEventListener('click', () => $('help').classList.remove('hidden'));
document.querySelectorAll('[data-close]').forEach(b =>
  b.addEventListener('click', () => $(b.dataset.close).classList.add('hidden')));

if (!window.isSecureContext) $('secureNote').textContent =
  'Note: open over HTTPS (e.g. GitHub Pages) or localhost — the camera is blocked otherwise.';

// ---- Component info panel ----
let infoCid = null;
function openInfo(cid) {
  const c = COMPONENTS.find(x => x.id === cid); if (!c) return;
  infoCid = cid;
  $('iFault').textContent = c.fault;
  $('iName').textContent  = c.name;
  $('iDesc').textContent  = c.desc;
  $('iExp').textContent   = c.exp;
  $('iMeas').textContent  = c.meas;
  $('iFix').textContent   = c.fix;
  $('markFixed').style.display = repaired.has(cid) ? 'none' : '';
  $('info').classList.remove('hidden');
  if (!inspected.has(cid)) { inspected.add(cid); faultsFound++; updateDash(); }
}
$('markFixed').addEventListener('click', () => {
  if (infoCid && !repaired.has(infoCid)) {
    repaired.add(infoCid); repairsDone++; AR.setRepaired(infoCid); updateDash();
    toast('✓ Repair logged — e-waste avoided');
  }
  $('info').classList.add('hidden');
});

// ---- Diagnostic SOP ----
let node = 'start';
$('diagBtn').addEventListener('click', () => { node='start'; renderNode(); $('sop').classList.remove('hidden'); });
$('sopRestart').addEventListener('click', () => { node='start'; renderNode(); });
function renderNode() {
  const n = DIAG[node]; const btns = $('sopBtns'); btns.innerHTML='';
  if (n.fix) {
    $('sopQ').innerHTML = '🔧 ' + n.fix;
    if (n.focus) AR.highlightComponent(n.focus);
    const done = document.createElement('button');
    done.className='sop-opt'; done.textContent='✓ Done';
    done.onclick = () => { $('sop').classList.add('hidden'); if (n.focus) openInfo(n.focus); };
    btns.appendChild(done);
  } else {
    $('sopQ').textContent = n.q;
    n.options.forEach(o => {
      const b=document.createElement('button'); b.className='sop-opt'; b.textContent=o.label;
      b.onclick=()=>{ node=o.go; renderNode(); }; btns.appendChild(b);
    });
  }
}

// ---- Impact dashboard + simulated telemetry ----
$('dashBtn').addEventListener('click', () => $('dash').classList.remove('hidden'));
function updateDash() {
  $('gFaults').textContent = faultsFound;
  $('gFixed').textContent  = repairsDone;
  $('iWaste').textContent  = (repairsDone*IMPACT.ewastePerRepair).toFixed(1)+' kg';
  $('iCo2').textContent    = (repairsDone*IMPACT.co2PerRepair).toFixed(1)+' kg';
  $('iLife').textContent   = (repairsDone?IMPACT.lifePerRepair:0)+' yr';
}
setInterval(() => {
  $('gTemp').textContent = (42 + Math.random()*8).toFixed(1);
  $('gVolt').textContent = (3.25 + Math.random()*0.12).toFixed(2);
}, 1500);

// ---- 3D model panel ----
$('modelBtn').addEventListener('click', () => {
  $('model').classList.remove('hidden');
  if (window.mvResize) window.mvResize();
});
