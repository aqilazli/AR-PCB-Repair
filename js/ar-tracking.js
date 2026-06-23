/* ============================================================
   ar-tracking.js — camera + ArUco detection + pose smoothing
     - opens the rear camera (with fallbacks)
     - detects the marker each frame, eases the group onto its pose
     - reports the detected marker id to a callback (board switching)
   Globals: AR, POS (js-aruco2, loaded in index.html).
   ============================================================ */
import * as THREE from 'three';
import { markerGroup, MODEL_SIZE, addFrameTask } from './ar-core.js';
import { $, toast } from './utils.js';

const video = $('video');
const dCanvas = $('detect');
const dCtx = dCanvas.getContext('2d', { willReadFrequently: true });

let detector = null, posit = null, lastSeen = 0, lastId = null, lastDetect = 0;
let candId = null, candCount = 0;   // id stabilization (ignore single-frame misreads)
const DETECT_MS = 45;      // detect ~22x/sec for a better chance to catch the marker
let idCb = () => {};
const SMOOTH = 0.10;   // heavy damping = very stable for small/noisy markers
const _tp = new THREE.Vector3(), _tq = new THREE.Quaternion(), _eu = new THREE.Euler();
let _hasTarget = false;

export function onMarkerId(cb) { idCb = cb; }

export async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast('No camera API — open over HTTPS'); return false;
  }
  const hi = { width: { ideal: 2560 }, height: { ideal: 1440 } };   // ask for max; phone grants what it can
  const af = [{ focusMode: 'continuous' }];                          // keep the marker in focus
  const tries = [
    { video: { facingMode: { exact: 'environment' }, ...hi, advanced: af }, audio: false },
    { video: { facingMode: { exact: 'environment' }, ...hi }, audio: false },
    { video: { facingMode: 'environment', ...hi }, audio: false },
    { video: { facingMode: 'environment' }, audio: false },
    { video: true, audio: false }
  ];
  let lastErr;
  for (const c of tries) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(c);
      video.srcObject = stream;
      // best-effort continuous autofocus if the camera supports it
      try {
        const track = stream.getVideoTracks()[0];
        if (track.getCapabilities && track.getCapabilities().focusMode &&
            track.getCapabilities().focusMode.includes('continuous')) {
          await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
        }
      } catch (e) {}
      await video.play().catch(()=>{});
      return true;
    } catch (e) { lastErr = e; }
  }
  toast('Camera error: ' + (lastErr && lastErr.name ? lastErr.name : 'unknown'));
  return false;
}

export function startTracking() {
  try {
    detector = new AR.Detector({ dictionaryName: 'ARUCO' });
    posit    = new POS.Posit(MODEL_SIZE, 0);
  } catch (e) { toast('AR init failed: ' + e.message); }
}

function detect() {
  if (!detector || !posit) return;
  const now = performance.now();
  // heavy decode throttled (~12x/sec); the cheap visibility check runs every frame
  if (now - lastDetect >= DETECT_MS && video.readyState === video.HAVE_ENOUGH_DATA) {
    lastDetect = now;
    const dw = Math.min(video.videoWidth || 1280, 1920);   // process near-full res = better range
    const dh = Math.round(dw * video.videoHeight / video.videoWidth);
    if (dCanvas.width !== dw) { dCanvas.width = dw; dCanvas.height = dh; posit.focalLength = dw; }
    dCtx.drawImage(video, 0, 0, dw, dh);
    const markers = detector.detect(dCtx.getImageData(0, 0, dw, dh));
    // LIVE DEBUG: what the detector actually sees, every scan
    const md = $('midDisplay');
    if (md) md.textContent = markers.length
      ? ('detected id: ' + markers.map(m => m.id).join(',') + '  (cam ' + (video.videoWidth||'?') + 'px)')
      : ('no marker  (cam ' + (video.videoWidth||'?') + 'px)');
    if (markers.length) {
      const m = markers[0];
      const corners = m.corners.map(c => ({ x: c.x - dw/2, y: dh/2 - c.y }));
      const pose = posit.pose(corners);
      if (pose) {
        applyPose(pose.bestRotation, pose.bestTranslation);
        markerGroup.visible = true; lastSeen = now; setTrack(true);
        // only switch board after the SAME id is seen twice (kills misread blink)
        if (m.id === candId) candCount++; else { candId = m.id; candCount = 1; }
        if (candCount >= 2 && m.id !== lastId) { lastId = m.id; idCb(m.id); }
      }
    }
  }
  // keep showing for ~1.2s after the last detection so brief misses don't flicker
  if (markerGroup.visible && now - lastSeen > 3500) { markerGroup.visible = false; setTrack(false); }
}

function applyPose(rot, t) {
  _tp.set(t[0], t[1], -t[2]);
  _eu.set(-Math.asin(-rot[1][2]), -Math.atan2(rot[0][2], rot[2][2]), Math.atan2(rot[1][0], rot[1][1]));
  _tq.setFromEuler(_eu);
  if (!_hasTarget) { markerGroup.position.copy(_tp); markerGroup.quaternion.copy(_tq); }
  _hasTarget = true;
}

function smooth() {
  if (_hasTarget && markerGroup.visible) {
    markerGroup.position.lerp(_tp, SMOOTH);
    markerGroup.quaternion.slerp(_tq, SMOOTH);
  }
}

function setTrack(on) {
  const pill = $('trackPill');
  pill.textContent = on ? '● Board locked' : '● Searching…';
  pill.className = 'pill ' + (on ? 'found' : 'lost');
  $('scanHint').style.opacity = on ? 0 : 1;
  const frame = $('scanFrame');               // viewfinder only while searching
  if (frame) frame.style.display = on ? 'none' : 'block';
}

addFrameTask(detect);
addFrameTask(smooth);
