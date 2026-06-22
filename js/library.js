/* ============================================================
   library.js — the board library data store
     - starts from the bundled defaults (window.DEFAULT_BOARDS)
     - merges the user's edits saved in localStorage
     - CRUD for boards + components
     - export to JSON and CSV, import from JSON
   ============================================================ */
const KEY = 'pcbar_library_v1';

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && Object.keys(saved).length) return saved;
  } catch (e) {}
  return clone(window.DEFAULT_BOARDS || {});
}

let lib = load();
function save() { localStorage.setItem(KEY, JSON.stringify(lib)); }

// ---- read ----
export const getBoardIds = () => Object.keys(lib);
export const getBoard    = (id) => lib[String(id)] || null;

// ---- boards ----
export function addBoard(id, name) {
  id = String(id);
  if (!lib[id]) lib[id] = { name: name || ('Board ' + id), components: [] };
  save(); return lib[id];
}
export function removeBoard(id) { delete lib[String(id)]; save(); }
export function updateBoardMeta(id, patch) { const b = getBoard(id); if (b) { Object.assign(b, patch); save(); } }

// ---- components ----
export function addComponent(id, comp) {
  const b = getBoard(id); if (!b) return;
  b.components = b.components || [];
  b.components.push(comp); save();
}
export function updateComponent(id, cid, patch) {
  const c = (getBoard(id)?.components || []).find(x => x.id === cid);
  if (c) { Object.assign(c, patch); save(); }
}
export function removeComponent(id, cid) {
  const b = getBoard(id); if (!b) return;
  b.components = b.components.filter(x => x.id !== cid); save();
}

// ---- import / export ----
export function exportJSON() { return JSON.stringify(lib, null, 2); }

export function importJSON(str) {
  const obj = JSON.parse(str);          // throws if invalid -> caller catches
  lib = obj; save();
}

export function exportCSV() {
  const cols = ['boardId','boardName','compId','name','x','y','fault','desc','expected','measured','fix'];
  const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const rows = [cols.join(',')];
  for (const id of getBoardIds()) {
    const b = lib[id];
    (b.components || []).forEach(c => {
      rows.push([id, b.name, c.id, c.name, c.x, c.y, c.fault, c.desc, c.exp, c.meas, c.fix].map(esc).join(','));
    });
  }
  return rows.join('\r\n');
}

export function resetToDefaults() { localStorage.removeItem(KEY); lib = load(); }
