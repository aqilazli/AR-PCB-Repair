/* ============================================================
   ar-hotspots.js — tappable component markers on the board
     - (re)builds hotspots when the board changes
     - pulses them, colours repaired ones green
     - hit-test for taps
   ============================================================ */
import * as THREE from 'three';
import { contentGroup, markerGroup, camera, MODEL_SIZE, addFrameTask } from './ar-core.js';

const hotspots = [];
const repaired = new Set();
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();

export function buildHotspots(components) {
  hotspots.forEach(h => contentGroup.remove(h));
  hotspots.length = 0;
  const n = (components || []).length;
  (components || []).forEach((cmp, i) => {
    const g = new THREE.Group();
    g.position.set(cmp.x*MODEL_SIZE, MODEL_SIZE*0.03, -cmp.y*MODEL_SIZE);  // dot sits just above the board
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(MODEL_SIZE*0.018, 24),
      new THREE.MeshBasicMaterial({ color:0xff3b30, transparent:true, opacity:0.95, side:THREE.DoubleSide }));
    disc.userData.cid = cmp.id;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(MODEL_SIZE*0.024, MODEL_SIZE*0.032, 24),
      new THREE.MeshBasicMaterial({ color:0xffd60a, transparent:true, opacity:0.9, side:THREE.DoubleSide }));

    // ── mind-map callout: label offset away from the board, leader line back to the dot ──
    const ang = (i / Math.max(1, n)) * Math.PI * 2;          // fan labels around the board
    const R   = MODEL_SIZE * 0.55;
    const lx  = Math.cos(ang) * R;
    const lz  = Math.sin(ang) * R;
    const ly  = MODEL_SIZE * (0.22 + (i % 3) * 0.10);        // stagger height so they don't collide
    const label = makeLabel(cmp.name || cmp.id);
    label.position.set(lx, ly, lz);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(lx, ly, lz) ]);
    const line = new THREE.Line(lineGeo,
      new THREE.LineBasicMaterial({ color:0x7fd0ff, transparent:true, opacity:0.55 }));

    g.add(disc); g.add(ring); g.add(line); g.add(label);
    g.userData = { cid: cmp.id, ring, disc, t: Math.random()*6 };
    contentGroup.add(g); hotspots.push(g);
  });
}

// A camera-facing text label (sprite) drawn on a canvas texture.
function makeLabel(text) {
  const font = 26, pad = 10;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `bold ${font}px sans-serif`;
  const w = ctx.measureText(text).width;
  c.width = Math.ceil(w + pad*2); c.height = font + pad*2;
  ctx.fillStyle = 'rgba(10,15,22,0.85)';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.font = `bold ${font}px sans-serif`;
  ctx.fillStyle = '#7fd0ff'; ctx.textBaseline = 'middle';
  ctx.fillText(text, pad, c.height/2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  const h = MODEL_SIZE * 0.12, aspect = c.width / c.height;
  sp.scale.set(h*aspect, h, 1);
  return sp;
}

export function setRepaired(cid) { repaired.add(cid); }
export function clearRepaired()   { repaired.clear(); }
export function highlight(cid) {
  const h = hotspots.find(x => x.userData.cid === cid);
  if (h) h.userData.ring.material.color.setHex(0x00e5ff);
}

/** Returns the component id under the screen point, or null. */
export function hitTest(clientX, clientY) {
  if (!markerGroup.visible) return null;
  ndc.x = (clientX/innerWidth)*2 - 1;
  ndc.y = -(clientY/innerHeight)*2 + 1;
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(hotspots.map(h => h.children[0]), false);
  return hits.length ? hits[0].object.userData.cid : null;
}

addFrameTask(() => {
  const t = performance.now()/1000;
  hotspots.forEach(h => {
    h.userData.ring.scale.setScalar(1 + 0.18*Math.sin(t*3 + h.userData.t));
    h.userData.disc.material.color.setHex(repaired.has(h.userData.cid) ? 0x34c759 : 0xff3b30);
  });
});
