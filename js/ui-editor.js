/* ============================================================
   ui-editor.js — board & component library editor
     - pick / add / remove a board
     - add / remove components (the repair methods)
     - export JSON, export CSV, import JSON, reset to defaults
   Saves through library.js (localStorage over bundled defaults).
   ============================================================ */
import { $, toast } from './utils.js';
import { state } from './state.js';
import * as Lib from './library.js';
import { buildHotspots } from './ar-hotspots.js';
import { setModel, screenToBoardXY } from './ar-model.js';
import { setPlaceMode } from './ar-controls.js';

let editId = null;   // board currently being edited

export function initEditor() {
  $('mEditor').addEventListener('click', () => { editId = state.boardId || Lib.getBoardIds()[0]; render(); $('editor').classList.remove('hidden'); });

  $('edAddBoard').addEventListener('click', () => {
    const id = prompt('New board ArUco marker id (a number):');
    if (id == null || id === '') return;
    const name = prompt('Board name:', 'Board ' + id) || ('Board ' + id);
    Lib.addBoard(id, name); editId = String(id); render();
    toast('Board ' + id + ' added — generate its marker with that id');
  });
  $('edDelBoard').addEventListener('click', () => {
    if (editId && confirm('Delete board ' + editId + '?')) { Lib.removeBoard(editId); editId = Lib.getBoardIds()[0] || null; render(); }
  });
  $('edAddComp').addEventListener('click', addComponent);

  $('edSaveMeta').addEventListener('click', () => {
    if (!editId) { toast('Add or select a board first'); return; }
    Lib.updateBoardMeta(editId, { name: $('edBoardName').value.trim() || ('Board ' + editId) });
    render(); toast('Name saved');
  });
  $('edSavePaths').addEventListener('click', () => {
    if (!editId) { toast('Add or select a board first'); return; }
    try {
      Lib.updateBoardMeta(editId, { glb: $('edBoardGlb').value.trim(), schematic: $('edBoardSchem').value.trim() });
      refreshAR(); render(); toast('Paths saved');
    } catch (err) { toast('Save failed: ' + err.message); }
  });

  // Load actual files into the board (stored as data URLs → exportable, offline).
  $('edGlbFile').addEventListener('change', (e) => loadFileInto(e, 'glb', true));
  $('edSchemFile').addEventListener('change', (e) => loadFileInto(e, 'schematic', false));

  $('edMarker').addEventListener('click', () => {
    if (editId == null) { toast('Select or add a board first'); return; }
    const id = parseInt(editId, 10);
    try {
      const svg = new window.AR.Dictionary('ARUCO').generateSVG(id);   // matches the detector
      download('marker_id' + id + '.svg', svg, 'image/svg+xml');
      toast('Marker id ' + id + ' downloaded — print it for this board');
    } catch (e) { toast('Marker error: ' + e.message); }
  });
  $('edExportJson').addEventListener('click', () => download('pcb-library.json', Lib.exportJSON(), 'application/json'));
  $('edExportCsv').addEventListener('click', () => download('pcb-library.csv', Lib.exportCSV(), 'text/csv'));
  $('edImport').addEventListener('change', importFile);
  $('edReset').addEventListener('click', () => { if (confirm('Reset to bundled defaults? Your edits will be lost.')) { Lib.resetToDefaults(); editId = Lib.getBoardIds()[0]; render(); } });
}

function render() {
  // board selector
  const sel = $('edBoardSel'); sel.innerHTML = '';
  Lib.getBoardIds().forEach(id => {
    const o = document.createElement('option'); o.value = id;
    o.textContent = 'id ' + id + ' — ' + (Lib.getBoard(id)?.name || '');
    if (id === editId) o.selected = true; sel.appendChild(o);
  });
  sel.onchange = () => { editId = sel.value; render(); };

  // board meta fields
  const board = Lib.getBoard(editId);
  $('edBoardName').value  = board?.name || '';
  // don't dump huge data: URLs into the text inputs — only show real paths
  $('edBoardGlb').value   = (board?.glb && !board.glb.startsWith('data:')) ? board.glb : '';
  $('edBoardSchem').value = (board?.schematic && !board.schematic.startsWith('data:')) ? board.schematic : '';
  const tag = v => v ? (v.startsWith('data:') ? 'loaded ✓' : 'path ✓') : 'none';
  $('edFiles').textContent = 'model: ' + tag(board?.glb) + '   ·   schematic: ' + tag(board?.schematic);

  // component list
  const list = $('edCompList'); list.innerHTML = '';
  (board?.components || []).forEach(c => {
    const row = document.createElement('div'); row.className = 'ed-row';
    row.innerHTML = `<b>${c.id}</b> — ${c.name} <span class="ed-fault">${c.fault||''}</span>`;
    const place = document.createElement('button'); place.className = 'ed-del'; place.textContent = '📍'; place.title = 'Tap to place on board';
    place.onclick = () => startPlace(c.id);
    const del = document.createElement('button'); del.className = 'ed-del'; del.textContent = '🗑';
    del.onclick = () => { Lib.removeComponent(editId, c.id); render(); refreshAR(); };
    row.appendChild(place); row.appendChild(del); list.appendChild(row);
  });
}

function addComponent() {
  if (!editId) { toast('Add or select a board first'); return; }
  const comp = {
    id:   ($('edcId').value || '').trim(),
    name: ($('edcName').value || '').trim(),
    x: parseFloat($('edcX').value) || 0,
    y: parseFloat($('edcY').value) || 0,
    fault: ($('edcFault').value || '').trim(),
    desc:  ($('edcDesc').value || '').trim(),
    exp:   ($('edcExp').value || '').trim(),
    meas:  ($('edcMeas').value || '').trim(),
    fix:   ($('edcFix').value || '').trim()
  };
  if (!comp.id || !comp.name) { toast('Component needs at least an id and a name'); return; }
  Lib.addComponent(editId, comp);
  ['edcId','edcName','edcX','edcY','edcFault','edcDesc','edcExp','edcMeas','edcFix'].forEach(i => $(i).value = '');
  render(); refreshAR();
  toast('Component added');
}

// If we edited the board that is currently tracked, rebuild its hotspots live.
function refreshAR() {
  if (editId && editId === state.boardId) {
    state.board = Lib.getBoard(editId);
    buildHotspots(state.board.components);
    if (state.board.glb) setModel(state.board.glb);
  }
}

function importFile(e) {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { try { Lib.importJSON(r.result); editId = Lib.getBoardIds()[0]; render(); refreshAR(); toast('Library imported'); }
                     catch (err) { toast('Invalid JSON: ' + err.message); } };
  r.readAsText(f); e.target.value = '';
}

// Tap-to-place: hide the editor, let the user tap the real component on the
// board; the dot snaps there and its x/y is saved.
function startPlace(cid) {
  if (editId !== state.boardId) { toast('Scan this board first, then place'); return; }
  $('editor').classList.add('hidden');
  toast('Tap ' + cid + ' on the board');
  setPlaceMode((cx, cy) => {
    const xy = screenToBoardXY(cx, cy);
    if (!xy) { toast('Missed — tap on the board model'); return false; }   // stay in place mode
    Lib.updateComponent(editId, cid, xy);
    state.board = Lib.getBoard(editId);
    buildHotspots(state.board.components);
    toast('Placed ' + cid + ' ✓');
    $('editor').classList.remove('hidden'); render();
    return true;
  });
}

function loadFileInto(e, key, isModel) {
  if (!editId) { toast('Add or select a board first'); e.target.value = ''; return; }
  const f = e.target.files[0]; if (!f) { return; }
  const r = new FileReader();
  r.onload = () => {
    try {
      Lib.updateBoardMeta(editId, { [key]: r.result });   // store as data URL
      if (isModel && editId === state.boardId) { state.board = Lib.getBoard(editId); setModel(r.result); }
      render();
      toast((isModel ? 'GLB' : 'Schematic') + ' loaded (' + (f.size/1048576).toFixed(1) + ' MB)');
    } catch (err) {
      toast('Too large to store on device — keep it in assets/ and use a path instead');
    }
  };
  r.readAsDataURL(f);
  e.target.value = '';
}

function download(name, text, mime) {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(a.href);
}
