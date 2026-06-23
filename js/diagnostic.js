/* ============================================================
   diagnostic.js — turns a board into a step-through decision tree
     - if the board defines a rich `diag` tree, use it as-is
     - otherwise auto-build a simple component-by-component checklist
   A node is either { q, options:[{label,go}] } or { fix, focus }.
   ============================================================ */
// Single-component diagnosis as an interactive question wizard:
//   symptom question → walk each check step (confirm to advance) → reveal the fix.
export function buildDiagForComponent(c) {
  if (!c) return { start: { fix: 'Component not found.', focus: null } };
  const steps = (c.steps && c.steps.length) ? c.steps
              : [ c.fix || 'Inspect, reseat or replace this component.' ];
  const d = {};
  d.start = { q: `Symptom: ${c.fault || 'fault'}.  Is ${c.name} showing this problem?`,
              options: [ { label: 'Yes — diagnose', go: 's0' },
                         { label: 'No / looks OK', go: 'ok' } ] };
  steps.forEach((s, i) => {
    const next = i < steps.length - 1 ? ('s' + (i + 1)) : 'fix';
    d['s' + i] = { q: `Step ${i + 1} of ${steps.length}:\n${s}`,
                   options: [ { label: 'Done — next ▶', go: next } ] };
  });
  d.fix = { fix: c.fix || 'Reseat or replace this component.', focus: c.id };
  d.ok  = { fix: `${c.name} appears serviceable — no action needed.`, focus: c.id };
  return d;
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
