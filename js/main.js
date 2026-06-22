/* ============================================================
   main.js — entry point. Wires the modules together.
   ============================================================ */
import { $, toast } from './utils.js';
import { state } from './state.js';
import * as Lib from './library.js';
import { startRenderLoop, contentGroup } from './ar-core.js';
import { loadModel, setModel } from './ar-model.js';
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
onMarkerId((id) => {
  const board = Lib.getBoard(id);
  if (!board) {                                   // unknown marker
    state.boardId = null; state.board = null;
    buildHotspots([]);                            // no hotspots
    contentGroup.visible = false;                 // hide the model too
    $('scanHint').textContent = 'Unknown marker (id ' + id + ') — please scan a registered board';
    $('scanHint').style.opacity = 1;
    toast('This ArUco marker is not in the library');
    return;
  }
  if (id === state.boardId) { contentGroup.visible = true; return; }
  state.boardId = String(id);
  state.board = board;
  contentGroup.visible = true;                    // show model + hotspots
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
$('aboutBtn').addEventListener('click', () => $('about').classList.remove('hidden'));
document.querySelectorAll('[data-close]').forEach(b =>
  b.addEventListener('click', () => $(b.dataset.close).classList.add('hidden')));
$('schematicBtn').addEventListener('click', () => {
  const url = (state.board && state.board.schematic) || '';
  if (!url) { toast('No schematic for this board'); return; }
  $('schematicFrame').src = url;
  $('schematicOpen').href = url;
  $('schematic').classList.remove('hidden');
});

if (!window.isSecureContext) $('secureNote').textContent =
  'Note: open over HTTPS (e.g. GitHub Pages) or localhost — the camera is blocked otherwise.';
