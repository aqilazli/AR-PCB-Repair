/* ============================================================
   state.js — shared runtime state (current board + counters)
   ============================================================ */
export const state = {
  boardId: null,          // current marker id (string)
  board:   null,          // current board object {name, components, diag?}
  faults:   new Set(),    // component ids inspected
  repaired: new Set()     // component ids marked repaired
};
