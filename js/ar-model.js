/* ============================================================
   ar-model.js — the 3D board model
     - loads the Draco GLB into the tracked group
     - eased finger-drag rotation/flip + pinch zoom
     - builds the standalone 3D viewer panel
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader }   from 'three/addons/loaders/DRACOLoader.js';
import { contentGroup, camera, MODEL_SIZE, addFrameTask } from './ar-core.js';
import { toast } from './utils.js';

let boardModel = null, baseScaleNum = 1, userScale = 1;
const baseQuat    = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2, 0, 0));
const userEuler   = new THREE.Euler();   // eased current rotation
const targetEuler = new THREE.Euler();   // drag target
const _q = new THREE.Quaternion();
const EASE = 0.12;   // smoother, more relaxed rotation

/** Swap the board model (e.g. when a different board is detected). */
export function setModel(url) {
  if (boardModel) { contentGroup.remove(boardModel); boardModel = null; }
  userScale = 1; userEuler.set(0,0,0); targetEuler.set(0,0,0);
  loadModel(url);
}

export function loadModel(url = 'assets/3d/pcb.glb') {
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/');
  const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
  loader.load(url, (gltf) => {
    boardModel = gltf.scene;
    const box = new THREE.Box3().setFromObject(boardModel);
    const size = box.getSize(new THREE.Vector3());
    const c    = box.getCenter(new THREE.Vector3());
    boardModel.position.sub(c);
    baseScaleNum = (MODEL_SIZE*1.4) / Math.max(size.x, size.y, size.z);
    boardModel.scale.setScalar(baseScaleNum);
    boardModel.quaternion.copy(baseQuat);          // fixed lay-flat; user transform is on contentGroup
    boardModel.position.y = MODEL_SIZE*0.05;
    contentGroup.add(boardModel);
  }, undefined, () => toast('Model load failed'));
}

// input → model transforms (called by ar-controls.js)
export function dragRotate(dx, dy, sens) { targetEuler.y -= dx*sens; targetEuler.x += dy*sens; }
export function zoomBy(mult) { userScale = Math.max(0.4, Math.min(3, userScale*mult)); }

// Tap-to-place calibration: project a screen tap onto the board model and
// return the component-space {x,y} (range about -0.5..0.5), or null if it
// missed the model. Used by the editor's 'Place' tool.
const _ray = new THREE.Raycaster(), _ndc = new THREE.Vector2(), _v = new THREE.Vector3();
export function screenToBoardXY(cx, cy) {
  if (!boardModel) return null;
  _ndc.x = (cx/innerWidth)*2 - 1; _ndc.y = -(cy/innerHeight)*2 + 1;
  _ray.setFromCamera(_ndc, camera);
  const hits = _ray.intersectObject(boardModel, true);
  if (!hits.length) return null;
  _v.copy(hits[0].point); contentGroup.worldToLocal(_v);   // world -> content-local
  return { x: _v.x / MODEL_SIZE, y: -_v.z / MODEL_SIZE };
}

// apply eased rotation + zoom to the WHOLE content group (model + hotspots),
// so the component points stay glued to the board when you rotate or zoom.
addFrameTask(() => {
  userEuler.x += (targetEuler.x - userEuler.x) * EASE;
  userEuler.y += (targetEuler.y - userEuler.y) * EASE;
  _q.setFromEuler(userEuler);
  contentGroup.quaternion.copy(_q);
  contentGroup.scale.setScalar(userScale);
});
