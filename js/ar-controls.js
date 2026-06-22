/* ============================================================
   ar-controls.js — touch input on the AR canvas
     1 finger  = rotate / flip the model
     2 fingers = pinch zoom
     tap (still)= inspect the hotspot under the finger
   ============================================================ */
import { $ } from './utils.js';
import { dragRotate, zoomBy } from './ar-model.js';
import { hitTest } from './ar-hotspots.js';

const ROT_SENS = 0.014;
const pointers = new Map();
let sx = 0, sy = 0, moved = 0, lastDist = 0;
let tapCb = () => {};

export function onTap(cb) { tapCb = cb; }

export function initControls() {
  const c = $('three');
  c.addEventListener('pointerdown',   down);
  c.addEventListener('pointermove',   move);
  c.addEventListener('pointerup',     up);
  c.addEventListener('pointercancel', up);
}

function down(e) {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) { sx = e.clientX; sy = e.clientY; moved = 0; }
  if (pointers.size === 2) lastDist = pinchDist();
}
function move(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size >= 2) {                       // pinch zoom
    const d = pinchDist();
    if (lastDist) zoomBy(d / lastDist);
    lastDist = d;
  } else {                                        // rotate
    const dx = e.clientX - sx, dy = e.clientY - sy;
    moved += Math.abs(dx) + Math.abs(dy);
    dragRotate(dx, dy, ROT_SENS);
    sx = e.clientX; sy = e.clientY;
  }
}
function up(e) {
  const wasSingle = pointers.size === 1;
  pointers.delete(e.pointerId);
  if (pointers.size < 2) lastDist = 0;
  if (wasSingle && moved < 8) {                   // tap = inspect
    const cid = hitTest(e.clientX, e.clientY);
    if (cid) tapCb(cid);
  }
}
function pinchDist() {
  const p = [...pointers.values()];
  return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
}
