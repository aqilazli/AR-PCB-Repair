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
  (components || []).forEach(cmp => {
    const g = new THREE.Group();
    g.position.set(cmp.x*MODEL_SIZE, MODEL_SIZE*0.03, -cmp.y*MODEL_SIZE);  // sit just above the board
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(MODEL_SIZE*0.05, 24),
      new THREE.MeshBasicMaterial({ color:0xff3b30, transparent:true, opacity:0.9, side:THREE.DoubleSide }));
    disc.userData.cid = cmp.id;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(MODEL_SIZE*0.06, MODEL_SIZE*0.08, 24),
      new THREE.MeshBasicMaterial({ color:0xffd60a, transparent:true, opacity:0.9, side:THREE.DoubleSide }));
    const label = makeLabel(cmp.name || cmp.id);
    label.position.set(0, MODEL_SIZE*0.14, 0);   // float the name above the dot
    g.add(disc); g.add(ring); g.add(label);
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
