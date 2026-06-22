/* ============================================================
   ar-setup.js — the AR engine
     camera video -> js-aruco2 detect -> POS pose
                  -> three.js renders model + hotspots on the board
   Exposes a small API consumed by main.js:
     initAR(), startCamera(), startARLoop(),
     onHotspotTap(cb), setRepaired(cid), highlightComponent(cid),
     buildModelPanel(obj)  (called internally after the model loads)
   Globals used: AR, POS (js-aruco2), window.COMPONENTS (data.js).
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader }   from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { $, toast } from './utils.js';

const COMPONENTS = window.COMPONENTS || [];
const MODEL_SIZE = 70;                 // marker physical size scaler (mm-ish)

let renderer, scene, camera, markerGroup, boardModel = null;
let detector = null, posit = null, lastSeen = 0;
const hotspots = [];
const repaired = new Set();
let tapCb = () => {};

const video  = $('video');
const glCanvas = $('three');
const dCanvas = $('detect');
const dCtx = dCanvas.getContext('2d', { willReadFrequently: true });

// ---- public API ---------------------------------------------
export function onHotspotTap(cb) { tapCb = cb; }
export function setRepaired(cid) { repaired.add(cid); }
export function highlightComponent(cid) {
  const h = hotspots.find(x => x.userData.cid === cid);
  if (h) h.userData.ring.material.color.setHex(0x00e5ff);
}

// ---- scene setup --------------------------------------------
export function initAR() {
  renderer = new THREE.WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene  = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, innerWidth/innerHeight, 1, 1000);
  scene.add(new THREE.AmbientLight(0xffffff, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(1,1,2); scene.add(key);

  markerGroup = new THREE.Group();
  markerGroup.visible = false;
  scene.add(markerGroup);

  loadModel();
  buildHotspots();

  addEventListener('resize', resize); resize();
  glCanvas.addEventListener('pointerdown', onTap);
}

function loadModel() {
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/');
  const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
  loader.load('assets/3d/pcb.glb', (gltf) => {
    boardModel = gltf.scene;
    const box = new THREE.Box3().setFromObject(boardModel);
    const size = box.getSize(new THREE.Vector3());
    const c    = box.getCenter(new THREE.Vector3());
    boardModel.position.sub(c);
    boardModel.scale.setScalar((MODEL_SIZE*1.4) / Math.max(size.x,size.y,size.z));
    boardModel.rotation.x = -Math.PI/2;
    boardModel.position.y = MODEL_SIZE*0.05;
    markerGroup.add(boardModel);
    buildModelPanel(gltf.scene.clone(true));
  }, undefined, e => toast('Model load failed'));
}

function buildHotspots() {
  COMPONENTS.forEach(cmp => {
    const g = new THREE.Group();
    g.position.set(cmp.x*MODEL_SIZE, MODEL_SIZE*0.12, -cmp.y*MODEL_SIZE);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(MODEL_SIZE*0.05, 24),
      new THREE.MeshBasicMaterial({ color:0xff3b30, transparent:true, opacity:0.9, side:THREE.DoubleSide }));
    disc.userData.cid = cmp.id;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(MODEL_SIZE*0.06, MODEL_SIZE*0.08, 24),
      new THREE.MeshBasicMaterial({ color:0xffd60a, transparent:true, opacity:0.9, side:THREE.DoubleSide }));
    g.add(disc); g.add(ring);
    g.userData = { cid: cmp.id, ring, disc, t: Math.random()*6 };
    markerGroup.add(g); hotspots.push(g);
  });
}

// ---- camera + detection -------------------------------------
export async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode:{ideal:'environment'}, width:{ideal:1280}, height:{ideal:720} }, audio:false });
    video.srcObject = stream; await video.play(); return true;
  } catch (e) { toast('Camera denied — allow it and reload'); return false; }
}

export function startARLoop() {
  try {
    detector = new AR.Detector({ dictionaryName: 'ARUCO' });
    posit    = new POS.Posit(MODEL_SIZE, 0);
  } catch (e) { toast('AR init failed: ' + e.message); }
  animate();
}

function detectFrame() {
  if (!detector || !posit) return;
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    const dw = 480, dh = Math.round(480 * video.videoHeight / video.videoWidth);
    if (dCanvas.width !== dw) { dCanvas.width = dw; dCanvas.height = dh; posit.focalLength = dw; }
    dCtx.drawImage(video, 0, 0, dw, dh);
    const markers = detector.detect(dCtx.getImageData(0, 0, dw, dh));
    // DEBUG: show how many markers + which ids the detector sees
    const hint = $('scanHint');
    if (hint) hint.textContent = markers.length
      ? ('marker id ' + markers.map(m=>m.id).join(',') + ' detected')
      : 'scanning… (0 markers) — fill frame, more light';
    if (markers.length) {
      const corners = markers[0].corners.map(c => ({ x: c.x - dw/2, y: dh/2 - c.y }));
      const pose = posit.pose(corners);
      if (pose) { applyPose(pose.bestRotation, pose.bestTranslation);
        markerGroup.visible = true; lastSeen = performance.now(); setTrack(true); }
    }
  }
  if (markerGroup.visible && performance.now() - lastSeen > 400) { markerGroup.visible = false; setTrack(false); }
}

function applyPose(rot, t) {
  markerGroup.position.set(t[0], t[1], -t[2]);
  markerGroup.rotation.set(
    -Math.asin(-rot[1][2]),
    -Math.atan2(rot[0][2], rot[2][2]),
     Math.atan2(rot[1][0], rot[1][1]));
}

function setTrack(on) {
  const pill = $('trackPill');
  pill.textContent = on ? '● Board locked' : '● Searching…';
  pill.className = 'pill ' + (on ? 'found' : 'lost');
  $('scanHint').style.opacity = on ? 0 : 1;
}

function animate() {
  requestAnimationFrame(animate);
  detectFrame();
  const time = performance.now()/1000;
  hotspots.forEach(h => {
    h.userData.ring.scale.setScalar(1 + 0.18*Math.sin(time*3 + h.userData.t));
    h.userData.disc.material.color.setHex(repaired.has(h.userData.cid) ? 0x34c759 : 0xff3b30);
  });
  renderer.render(scene, camera);
}

function resize() {
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

// ---- tap to inspect -----------------------------------------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function onTap(e) {
  if (!markerGroup.visible) return;
  ndc.x = (e.clientX/innerWidth)*2 - 1;
  ndc.y = -(e.clientY/innerHeight)*2 + 1;
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(hotspots.map(h => h.children[0]), false);
  if (hits.length) tapCb(hits[0].object.userData.cid);
}

// ---- 3D model viewer panel (separate scene + OrbitControls) -
export function buildModelPanel(obj) {
  const canvas = $('modelCanvas');
  const r = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  r.setPixelRatio(Math.min(devicePixelRatio,2)); r.outputColorSpace = THREE.SRGBColorSpace;
  const sc = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  sc.add(new THREE.AmbientLight(0xffffff,1.3));
  const d = new THREE.DirectionalLight(0xffffff,1.5); d.position.set(2,3,4); sc.add(d);
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  obj.position.sub(c); sc.add(obj);
  const maxd = Math.max(size.x,size.y,size.z)||1; cam.position.set(maxd, maxd*0.8, maxd*1.4);
  const ctr = new OrbitControls(cam, canvas); ctr.enableDamping=true; ctr.autoRotate=true; ctr.autoRotateSpeed=1.2;
  function mvResize(){ const w=canvas.clientWidth||320,h=canvas.clientHeight||320; r.setSize(w,h,false); cam.aspect=w/h; cam.updateProjectionMatrix(); }
  window.mvResize = mvResize; mvResize();
  (function loop(){ requestAnimationFrame(loop); ctr.update(); r.render(sc,cam); })();
}
