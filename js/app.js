/* ============================================================
   app.js  —  AR PCB Repair Assistant (main module)

   Pipeline:
     camera video  ->  js-aruco2 detect (marker id + corners)
                   ->  POS.Posit pose (rotation + translation)
                   ->  three.js renders the model + hotspots on the board
     taps          ->  raycast hotspots -> component info
     UI            ->  diagnostic SOP, impact dashboard, 3D model panel
   Globals used (from data.js / js-aruco2): COMPONENTS, DIAG, IMPACT, AR, POS.
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader }   from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---- DOM helpers --------------------------------------------
const $ = id => document.getElementById(id);
const toast = msg => { const t=$('toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),2200); };

// ---- State --------------------------------------------------
let faultsFound = 0, repairsDone = 0;
const inspected = new Set(), repaired = new Set();

// ============================================================
//  THREE.JS — AR SCENE (overlay above the camera video)
// ============================================================
const video   = $('video');
const glCanvas = $('three');
const dCanvas = $('detect');
const dCtx    = dCanvas.getContext('2d', { willReadFrequently: true });

const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth/innerHeight, 1, 1000);

scene.add(new THREE.AmbientLight(0xffffff, 1.4));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(1,1,2); scene.add(key);

// All tracked content lives in this group; its pose is set each frame.
const markerGroup = new THREE.Group();
markerGroup.visible = false;
scene.add(markerGroup);

const MODEL_SIZE = 70;                  // marker physical size scaler (mm-ish)
const posit = new POS.Posit(MODEL_SIZE, 0); // focal set per-frame from detect width

// ---- Load the 3D board model (Draco) into the group --------
const draco = new DRACOLoader();
draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/');
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(draco);

let boardModel = null;
gltfLoader.load('assets/pcb.glb', (gltf) => {
  boardModel = gltf.scene;
  // normalise: centre + scale to ~marker size, lay flat on the marker plane
  const box = new THREE.Box3().setFromObject(boardModel);
  const size = box.getSize(new THREE.Vector3());
  const c    = box.getCenter(new THREE.Vector3());
  boardModel.position.sub(c);
  const s = (MODEL_SIZE * 1.4) / Math.max(size.x, size.y, size.z);
  boardModel.scale.setScalar(s);
  boardModel.rotation.x = -Math.PI/2;     // lay flat on the marker
  boardModel.position.y = MODEL_SIZE * 0.05;
  markerGroup.add(boardModel);
  buildModelPanel(gltf.scene.clone(true)); // feed the 3D viewer panel too
}, undefined, e => console.warn('GLB load failed', e));

// ---- Build tappable component hotspots ---------------------
const hotspots = [];
COMPONENTS.forEach(cmp => {
  const g = new THREE.Group();
  g.position.set(cmp.x * MODEL_SIZE, MODEL_SIZE*0.12, -cmp.y * MODEL_SIZE);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(MODEL_SIZE*0.05, 24),
    new THREE.MeshBasicMaterial({ color:0xff3b30, transparent:true, opacity:0.9, side:THREE.DoubleSide })
  );
  disc.userData.cid = cmp.id;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(MODEL_SIZE*0.06, MODEL_SIZE*0.08, 24),
    new THREE.MeshBasicMaterial({ color:0xffd60a, transparent:true, opacity:0.9, side:THREE.DoubleSide })
  );
  g.add(disc); g.add(ring);
  g.userData = { cid: cmp.id, ring, disc, t: Math.random()*6 };
  markerGroup.add(g);
  hotspots.push(g);
});

// ---- Camera feed --------------------------------------------
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal:'environment' }, width:{ideal:1280}, height:{ideal:720} }, audio:false
    });
    video.srcObject = stream;
    await video.play();
    return true;
  } catch (e) { toast('Camera denied — allow it and reload'); console.warn(e); return false; }
}

// ---- Detection + pose loop ----------------------------------
const detector = new AR.Detector({ dictionaryName: 'ARUCO' });
let lastSeen = 0;

function detectFrame() {
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    const dw = 480, dh = Math.round(480 * video.videoHeight / video.videoWidth);
    if (dCanvas.width !== dw) { dCanvas.width = dw; dCanvas.height = dh; posit.focalLength = dw; }
    dCtx.drawImage(video, 0, 0, dw, dh);
    const img = dCtx.getImageData(0, 0, dw, dh);
    const markers = detector.detect(img);

    if (markers.length) {
      const m = markers[0];
      // centre corners for POSIT, flip Y
      const corners = m.corners.map(c => ({ x: c.x - dw/2, y: dh/2 - c.y }));
      const pose = posit.pose(corners);
      if (pose) {
        applyPose(pose.bestRotation, pose.bestTranslation);
        markerGroup.visible = true;
        lastSeen = performance.now();
        setTrack(true);
      }
    }
  }
  // hide overlay shortly after the marker is lost (avoids flicker)
  if (markerGroup.visible && performance.now() - lastSeen > 400) {
    markerGroup.visible = false; setTrack(false);
  }
}

// Standard js-aruco -> three.js pose mapping
function applyPose(rot, t) {
  markerGroup.position.set(t[0], t[1], -t[2]);
  markerGroup.rotation.set(
    -Math.asin(-rot[1][2]),
    -Math.atan2(rot[0][2], rot[2][2]),
     Math.atan2(rot[1][0], rot[1][1])
  );
}

function setTrack(on) {
  const pill = $('trackPill');
  pill.textContent = on ? '● Board locked' : '● Searching…';
  pill.className = 'pill ' + (on ? 'found' : 'lost');
  $('scanHint').style.opacity = on ? 0 : 1;
}

// ---- Render loop --------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  detectFrame();
  // pulse hotspot rings; highlight any focused/repaired component
  const time = performance.now()/1000;
  hotspots.forEach(h => {
    const s = 1 + 0.18*Math.sin(time*3 + h.userData.t);
    h.userData.ring.scale.setScalar(s);
    const done = repaired.has(h.userData.cid);
    h.userData.disc.material.color.setHex(done ? 0x34c759 : 0xff3b30);
  });
  renderer.render(scene, camera);
}

function resize() {
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize); resize();

// ---- Tap to inspect a hotspot -------------------------------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
glCanvas.addEventListener('pointerdown', (e) => {
  if (!markerGroup.visible) return;
  ndc.x = (e.clientX/innerWidth)*2 - 1;
  ndc.y = -(e.clientY/innerHeight)*2 + 1;
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(hotspots.map(h=>h.children[0]), false); // discs
  if (hits.length) openInfo(hits[0].object.userData.cid);
});

// ============================================================
//  UI LOGIC
// ============================================================
// ---- Intro / start ----
$('startBtn').addEventListener('click', async () => {
  const ok = await startCamera();
  if (!ok) return;
  $('intro').classList.add('hidden');
  $('hud').classList.remove('hidden');
  animate();
});
$('helpBtn').addEventListener('click', () => $('help').classList.remove('hidden'));
document.querySelectorAll('[data-close]').forEach(b =>
  b.addEventListener('click', () => $(b.dataset.close).classList.add('hidden')));

// secure-context note (camera needs https or localhost)
if (!window.isSecureContext) $('secureNote').textContent =
  'Note: open over HTTPS (e.g. GitHub Pages) or localhost — the camera is blocked otherwise.';

// ---- Component info panel ----
let infoCid = null;
function openInfo(cid) {
  const c = COMPONENTS.find(x => x.id === cid); if (!c) return;
  infoCid = cid;
  $('iFault').textContent = c.fault;
  $('iName').textContent  = c.name;
  $('iDesc').textContent  = c.desc;
  $('iExp').textContent   = c.exp;
  $('iMeas').textContent  = c.meas;
  $('iFix').textContent   = c.fix;
  $('markFixed').style.display = repaired.has(cid) ? 'none' : '';
  $('info').classList.remove('hidden');
  if (!inspected.has(cid)) { inspected.add(cid); faultsFound++; updateDash(); }
}
$('markFixed').addEventListener('click', () => {
  if (infoCid && !repaired.has(infoCid)) {
    repaired.add(infoCid); repairsDone++; updateDash();
    toast('✓ Repair logged — e-waste avoided');
  }
  $('info').classList.add('hidden');
});

// ---- Diagnostic SOP ----
let node = 'start';
$('diagBtn').addEventListener('click', () => { node='start'; renderNode(); $('sop').classList.remove('hidden'); });
$('sopRestart').addEventListener('click', () => { node='start'; renderNode(); });
function renderNode() {
  const n = DIAG[node]; const btns = $('sopBtns'); btns.innerHTML='';
  if (n.fix) {
    $('sopQ').innerHTML = '🔧 ' + n.fix;
    if (n.focus) highlight(n.focus);
    const done = document.createElement('button');
    done.className='sop-opt'; done.textContent='✓ Done';
    done.onclick = () => { $('sop').classList.add('hidden'); if(n.focus) openInfo(n.focus); };
    btns.appendChild(done);
  } else {
    $('sopQ').textContent = n.q;
    n.options.forEach(o => {
      const b=document.createElement('button'); b.className='sop-opt'; b.textContent=o.label;
      b.onclick=()=>{ node=o.go; renderNode(); }; btns.appendChild(b);
    });
  }
}
function highlight(cid) {
  const h = hotspots.find(x=>x.userData.cid===cid);
  if (h) { h.userData.ring.material.color.setHex(0x00e5ff); }
}

// ---- Impact dashboard + simulated telemetry ----
$('dashBtn').addEventListener('click', () => $('dash').classList.remove('hidden'));
function updateDash() {
  $('gFaults').textContent = faultsFound;
  $('gFixed').textContent  = repairsDone;
  $('iWaste').textContent  = (repairsDone*IMPACT.ewastePerRepair).toFixed(1)+' kg';
  $('iCo2').textContent    = (repairsDone*IMPACT.co2PerRepair).toFixed(1)+' kg';
  $('iLife').textContent   = (repairsDone?IMPACT.lifePerRepair:0)+' yr';
}
setInterval(() => {
  $('gTemp').textContent = (42 + Math.random()*8).toFixed(1);
  $('gVolt').textContent = (3.25 + Math.random()*0.12).toFixed(2);
}, 1500);

// ---- 3D model viewer panel (separate scene + OrbitControls) ----
let mvReady = false;
$('modelBtn').addEventListener('click', () => {
  $('model').classList.remove('hidden');
  if (mvReady && window.mvResize) window.mvResize();
});
function buildModelPanel(obj) {
  const canvas = $('modelCanvas');
  const r = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  r.setPixelRatio(Math.min(devicePixelRatio,2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  const sc = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  sc.add(new THREE.AmbientLight(0xffffff,1.3));
  const d=new THREE.DirectionalLight(0xffffff,1.5); d.position.set(2,3,4); sc.add(d);
  const box=new THREE.Box3().setFromObject(obj), size=box.getSize(new THREE.Vector3()), c=box.getCenter(new THREE.Vector3());
  obj.position.sub(c); sc.add(obj);
  const maxd=Math.max(size.x,size.y,size.z)||1; cam.position.set(maxd, maxd*0.8, maxd*1.4);
  const ctr=new OrbitControls(cam, canvas); ctr.enableDamping=true; ctr.autoRotate=true; ctr.autoRotateSpeed=1.2;
  function mvResize(){ const w=canvas.clientWidth||320,h=canvas.clientHeight||320; r.setSize(w,h,false); cam.aspect=w/h; cam.updateProjectionMatrix(); }
  window.mvResize = mvResize; mvResize();
  (function loop(){ requestAnimationFrame(loop); ctr.update(); r.render(sc,cam); })();
  mvReady = true;
}
