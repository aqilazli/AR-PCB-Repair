/* ============================================================
   utils.js — small general helpers shared across modules
   ============================================================ */

/** Shorthand for document.getElementById. */
export const $ = (id) => document.getElementById(id);

/** Brief bottom toast message. */
let _toastTimer;
export function toast(msg) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
