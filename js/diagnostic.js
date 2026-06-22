/* ============================================================
   diagnostic.js — turns a board into a step-through decision tree
     - if the board defines a rich `diag` tree, use it as-is
     - otherwise auto-build a simple component-by-component checklist
   A node is either { q, options:[{label,go}] } or { fix, focus }.
   ============================================================ */
export function buildDiag(board) {
  if (board && board.diag) return board.diag;

  const comps = (board && board.components) || [];
  const d = {};
  comps.forEach((c, i) => {
    const next = i < comps.length - 1 ? ('c' + (i + 1)) : 'ok';
    d['c' + i] = { q: `Check ${c.name} — ${c.fault}?`,
                   options: [ { label: 'Yes (faulty)', go: 'f' + i }, { label: 'No', go: next } ] };
    d['f' + i] = { fix: c.fix, focus: c.id };
  });
  d.ok = { fix: 'No faults found — the board appears serviceable.', focus: null };
  d.start = d.c0 || { fix: 'No components defined for this board yet.', focus: null };
  return d;
}
