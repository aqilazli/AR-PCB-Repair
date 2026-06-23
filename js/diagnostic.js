/* ============================================================
   diagnostic.js — turns a board into a step-through decision tree
     - if the board defines a rich `diag` tree, use it as-is
     - otherwise auto-build a simple component-by-component checklist
   A node is either { q, options:[{label,go}] } or { fix, focus }.
   ============================================================ */
// Single-component diagnosis: tap a point → ask only THAT component's question,
// Yes → its fix, No → it looks OK. No walking through the other components.
export function buildDiagForComponent(c) {
  if (!c) return { start: { fix: 'Component not found.', focus: null } };
  return {
    start: { q: `Check ${c.name} — ${c.fault}?`,
             options: [ { label: 'Yes (faulty)', go: 'fix' },
                        { label: 'No / looks OK', go: 'ok' } ] },
    fix: { fix: c.fix || 'Inspect and reseat/replace this component.', focus: c.id },
    ok:  { fix: `${c.name} appears serviceable.`, focus: c.id }
  };
}

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
