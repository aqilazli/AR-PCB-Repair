/* ============================================================
   ar-core.js — shared three.js scene, camera, render loop
   Other AR modules import these and register per-frame tasks.
   ============================================================ */
import * as THREE from 'three';

export const MODEL_SIZE = 70;   // marker physical-size scaler (mm-ish)

export const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('three'), alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

export const scene  = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(40, innerWidth/innerHeight, 1, 1000);

scene.add(new THREE.AmbientLight(0xffffff, 1.4));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(1,1,2); scene.add(key);

// markerGroup carries the tracked POSE (set by ar-tracking each frame).
export const markerGroup = new THREE.Group();
markerGroup.visible = false;
scene.add(markerGroup);

// contentGroup carries the USER transform (drag-rotate + pinch-zoom) and holds
// BOTH the model and the hotspots, so they scale/rotate together and stay aligned.
export const contentGroup = new THREE.Group();
markerGroup.add(contentGroup);

// Feature modules push per-frame callbacks here.
const tasks = [];
export function addFrameTask(fn) { tasks.push(fn); }

function resize() {
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize); resize();

export function startRenderLoop() {
  (function loop() {
    requestAnimationFrame(loop);
    for (const t of tasks) t();
    renderer.render(scene, camera);
  })();
}
