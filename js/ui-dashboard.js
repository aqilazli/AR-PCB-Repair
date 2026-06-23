/* ============================================================
   ui-dashboard.js — impact dashboard + simulated telemetry
   ============================================================ */
import { $ } from './utils.js';
import { state } from './state.js';

const IMPACT = window.IMPACT || { ewastePerRepair:0.4, co2PerRepair:12, lifePerRepair:2 };

export function updateDash() {
  const repairs = state.repaired.size;
  $('gFaults').textContent = state.faults.size;
  $('gFixed').textContent  = repairs;
  $('iWaste').textContent  = (repairs*IMPACT.ewastePerRepair).toFixed(1)+' kg';
  $('iCo2').textContent    = (repairs*IMPACT.co2PerRepair).toFixed(1)+' kg';
  $('iLife').textContent   = (repairs?IMPACT.lifePerRepair:0)+' yr';
}

export function initDashboard() {
  $('mDash').addEventListener('click', () => $('dash').classList.remove('hidden'));
  setInterval(() => {                       // simulated live board telemetry
    $('gTemp').textContent = (42 + Math.random()*8).toFixed(1);
    $('gVolt').textContent = (3.25 + Math.random()*0.12).toFixed(2);
  }, 1500);
}
