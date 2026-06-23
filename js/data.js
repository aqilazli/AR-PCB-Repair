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
  "0": {
    name: "Raspberry Pi (Model B)",
    glb: "assets/3d/pcb.glb",
    schematic: "assets/docs/Raspberry-Pi-Schematics.pdf",
    components: [
      // x = left(-)/right(+), y = bottom(-)/top(+), z = height. Defaults follow
      // the standard Pi 3 B layout; fine-tune with the 📍 Place tool.
      { id:'gpio', name:'GPIO Header (40-pin)', x:0.150, y:-0.453, z:0,
        fault:'PIN NOT WORKING', desc:'40-pin header along the top edge for add-on boards.',
        exp:'3.3 V on pin 1', meas:'0 V', fix:'Check for bent/shorted pins; verify the 3.3V rail; reflow the header.' },
      { id:'eth', name:'Ethernet Port', x:-0.643, y:0.221, z:0,
        fault:'NO NETWORK', desc:'10/100 wired network port at the top-right corner.',
        exp:'link LED on', meas:'no link', fix:'Check the cable; inspect the port pins and magnetics; reflow if cold-jointed.' },
      { id:'usb', name:'USB Ports (4x)', x:-0.711, y:-0.297, z:0,
        fault:'NO USB DEVICE', desc:'USB 2.0 ports on the right edge.',
        exp:'device detected', meas:'nothing', fix:'Check the USB power budget; reflow the port pins; test another device.' },
      { id:'cpu', name:'BCM2837 — Quad-Core CPU', x:0.155, y:-0.118, z:0,
        fault:'OVERHEAT', desc:'Main processor in the centre of the board (Raspberry logo).',
        exp:'< 70 °C', meas:'93 °C', fix:'Check rails for shorts before powering; inspect for solder bridges.' },
      { id:'wifi', name:'BCM43438 — WiFi / BT', x:-0.338, y:-0.131, z:0,
        fault:'NO WIFI', desc:'Shielded wireless module near the top-left corner.',
        exp:'scans networks', meas:'not detected', fix:'Reflow the module; check the 3.3V supply and antenna.' },
      { id:'power', name:'Micro-USB Power Input', x:0.532, y:0.367, z:0,
        fault:'NO POWER', desc:'5V power input at the bottom-left corner.',
        exp:'5.1 V', meas:'0 V', fix:'Try a known-good 5V/2.5A supply; reflow or replace the micro-USB port.' },
      { id:'d5', name:'D5 — TVS Diode (SMBJ5.0A)', x:0.385, y:0.314, z:0,
        fault:'SHORTED', desc:'Over-voltage protection diode near the power input.',
        exp:'open / blocking', meas:'0.3 Ω short', fix:'Remove or replace D5; check the micro-USB input for damage.' },
      { id:'hdmi', name:'HDMI Output', x:0.121, y:0.345, z:0,
        fault:'NO DISPLAY', desc:'Video output at the bottom edge, centre.',
        exp:'image on screen', meas:'no signal', fix:'Try another cable/monitor; reflow the HDMI connector pins.' }
    ]
    // No custom `diag`: the app auto-builds the diagnostic from the components
    // above, so every question maps to a labelled point on the board.
  }
};

/* Impact factors per repaired board (conservative averages). */
window.IMPACT = { ewastePerRepair: 0.4, co2PerRepair: 12.0, lifePerRepair: 2 };
