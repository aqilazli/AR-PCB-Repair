/* ============================================================
   main.js — entry point. Wires the modules together.
   ============================================================ */
import { $, toast } from './utils.js';
import { state } from './state.js';
import * as Lib from './library.js';
import { startRenderLoop, contentGroup } from './ar-core.js';
import { loadModel, setModel, resetView } from './ar-model.js';
import { buildHotspots } from './ar-hotspots.js';
import { startCamera, startTracking, onMarkerId } from './ar-tracking.js';
import { initControls, onTap } from './ar-controls.js';
import { openInfo, initInfo } from './ui-info.js';
import { initSOP } from './ui-sop.js';
import { initDashboard } from './ui-dashboard.js';
import { initEditor } from './ui-editor.js';

// ---- build the AR scene (no camera yet) ----
loadModel();
initControls();
onTap(openInfo);
initInfo(); initSOP(); initDashboard(); initEditor();
startRenderLoop();

// ---- board switching by marker id ----
let unknownTimer = null;
onMarkerId((id) => {
  $('midDisplay').textContent = 'marker id: ' + id;
  const board = Lib.getBoard(id);
  if (!board) {                                   // unknown marker — delay the warning
    clearTimeout(unknownTimer);
    unknownTimer = setTimeout(() => {
      state.boardId = null; state.board = null;
      buildHotspots([]); contentGroup.visible = false;
      $('scanHint').textContent = 'Unknown marker. Scan another board.';
      $('scanHint').style.opacity = 1;
      toast('Unknown marker');
    }, 800);
    return;
  }
  clearTimeout(unknownTimer);                      // a known marker cancels the pending warning
  if (id === state.boardId) { contentGroup.visible = true; return; }
  state.boardId = String(id);
  state.board = board;
  contentGroup.visible = true;
  buildHotspots(board.components);
  if (board.glb && board.glb !== lastGlb) { setModel(board.glb); lastGlb = board.glb; }
  $('scanHint').textContent = board.name + ' — tap a component or start diagnosis';
});
let lastGlb = 'assets/3d/pcb.glb';

// ---- intro / start ----
$('startBtn').addEventListener('click', async () => {
  const ok = await startCamera();
  if (!ok) return;
  // go fullscreen so the browser bar doesn't cover the AR view (Android Chrome)
  const el = document.documentElement;
  const fs = el.requestFullscreen || el.webkitRequestFullscreen;
  if (fs) { try { fs.call(el); } catch (e) {} }
  $('intro').classList.add('hidden');
  $('hud').classList.remove('hidden');
  startTracking();
});
$('helpBtn').addEventListener('click', () => $('help').classList.remove('hidden'));

// settings menu: one button opens the menu; each item closes it then opens its panel
$('settingsBtn').addEventListener('click', () => $('settings').classList.remove('hidden'));
document.querySelectorAll('#settings .menu').forEach(b =>
  b.addEventListener('click', () => $('settings').classList.add('hidden')));
$('mResetView').addEventListener('click', () => { resetView(); toast('View reset'); });
$('mAbout').addEventListener('click', () => $('about').classList.remove('hidden'));
$('mHelp').addEventListener('click', () => $('help').classList.remove('hidden'));
document.querySelectorAll('[data-close]').forEach(b =>
  b.addEventListener('click', () => $(b.dataset.close).classList.add('hidden')));
$('mSchem').addEventListener('click', () => {
  const url = (state.board && state.board.schematic) || '';
  if (!url) { toast('No schematic for this board'); return; }
  $('schematicFrame').src = url;
  $('schematicOpen').href = url;
  $('schematic').classList.remove('hidden');
});

if (!window.isSecureContext) $('secureNote').textContent =
  'Note: open over HTTPS (e.g. GitHub Pages) or localhost — the camera is blocked otherwise.';
