/* ============================================================
   data.js — DEFAULT board library (global)
   A "board" is keyed by its ArUco marker id. Add another board
   by giving it a new marker id and its own components.
   Users can also add/edit/remove boards in-app (Editor panel),
   which is saved to localStorage and merged over these defaults.
   Each component: id, name, x/y (marker-plane −0.5..0.5),
                   fault, desc, exp, meas, fix.
   Optional per-board `diag` = a branching decision tree; if absent
   the app auto-builds a simple component checklist.
   ============================================================ */

window.DEFAULT_BOARDS = {
  "1": {
    name: "Raspberry Pi (Model B)",
    glb: "assets/3d/pcb.glb",
    schematic: "assets/docs/Raspberry-Pi-Schematics.pdf",
    components: [
      { id:'d5',   name:'D5 — TVS Diode (SMBJ5.0A)', x:-0.35, y:0.18,
        fault:'SHORTED', desc:'Over-voltage protection diode. A surge can short it, killing the 5V rail.',
        exp:'open / blocking', meas:'0.3 Ω short', fix:'Remove or replace D5; check the micro-USB input for damage.' },
      { id:'pmic', name:'MXL7704 — Power Mgmt IC', x:-0.10, y:0.05,
        fault:'NO 3.3V', desc:'Generates the 1.2V / 1.8V / 3.3V rails for the whole board.',
        exp:'3.30 V out', meas:'0.00 V', fix:'Reflow the PMIC pins; verify 5V at PP1/PP2; replace if dead.' },
      { id:'cpu',  name:'BCM2837 — Quad-Core CPU', x:0.12, y:-0.04,
        fault:'OVERHEAT', desc:'Main processor. Continuous green-LED + heat can indicate a short on a rail.',
        exp:'< 70 °C', meas:'93 °C', fix:'Check rails for shorts before powering; inspect for solder bridges.' },
      { id:'lan',  name:'LAN9514 — USB/Ethernet', x:0.34, y:0.16,
        fault:'NO ETHERNET', desc:'Bridges the CPU to the USB hub and Ethernet port.',
        exp:'link up', meas:'no link', fix:'Reflow U2; inspect the Ethernet magnetics and USB pads.' },
      { id:'wifi', name:'BCM43438 — WiFi / BT', x:0.30, y:-0.20,
        fault:'NO WIFI', desc:'On-board wireless module for WiFi and Bluetooth.',
        exp:'scans networks', meas:'not detected', fix:'Reflow the module; check the 3.3V supply and antenna.' }
    ],
    // Rich branching diagnostic (mirrors the troubleshooting flowchart).
    diag: {
      start:   { q:'Is the RED power LED on?',           options:[ {label:'Yes',go:'chk_act'}, {label:'No',go:'meas_5v'} ] },
      meas_5v: { q:'Measure PP1/PP2 — is 5V present?',   options:[ {label:'Yes',go:'chk_33'}, {label:'No',go:'tvs'} ] },
      tvs:     { fix:'D5 TVS diode likely shorted → remove/replace it, or replace the micro-USB connector.', focus:'d5' },
      chk_33:  { q:'Is 3.3V present at GPIO pin 1?',     options:[ {label:'Yes',go:'chk_act'}, {label:'No',go:'pmic'} ] },
      pmic:    { fix:'Power IC fault → reflow or replace the MXL7704 PMIC.', focus:'pmic' },
      chk_act: { q:'What is the GREEN ACT LED doing?',
                 options:[ {label:'No activity',go:'sd'}, {label:'Steady on',go:'soc'}, {label:'Blinking normally',go:'hot'} ] },
      sd:      { fix:'No boot activity → re-image the SD card and re-seat it.', focus:null },
      soc:     { fix:'Steady LED suggests an SoC/rail short → check rails before replacing the board.', focus:'cpu' },
      hot:     { q:'Is any component hot to the touch?',
                 options:[ {label:'WiFi/BT hot',go:'fix_wifi'}, {label:'USB/Eth hot',go:'fix_lan'}, {label:'CPU hot',go:'fix_cpu'}, {label:'None',go:'ok'} ] },
      fix_wifi:{ fix:'Replace the BCM43438 WiFi/BT module; check its 3.3V supply.', focus:'wifi' },
      fix_lan: { fix:'Check/replace the LAN9514 USB/Ethernet controller.', focus:'lan' },
      fix_cpu: { fix:'Check rails for shorts near the BCM2837; reflow or replace if confirmed.', focus:'cpu' },
      ok:      { fix:'No fault found — board appears healthy. Log it as serviceable.', focus:null }
    }
  }
};

/* Impact factors per repaired board (conservative averages). */
window.IMPACT = { ewastePerRepair: 0.4, co2PerRepair: 12.0, lifePerRepair: 2 };
