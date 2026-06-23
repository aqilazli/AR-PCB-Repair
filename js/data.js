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
      { id:'power', name:'Micro-USB Power Input', x:-0.40, y:0.15,
        fault:'NO POWER', desc:'5V power input. A bad cable or damaged port stops the board powering on.',
        exp:'5.1 V', meas:'0 V', fix:'Try a known-good 5V/2.5A supply; reflow or replace the micro-USB port.' },
      { id:'usb', name:'USB Ports (4x)', x:0.40, y:-0.05,
        fault:'NO USB DEVICE', desc:'USB 2.0 ports for keyboard, mouse and storage.',
        exp:'device detected', meas:'nothing', fix:'Check the USB power budget; reflow the port pins; test another device.' },
      { id:'eth', name:'Ethernet Port', x:0.40, y:0.20,
        fault:'NO NETWORK', desc:'10/100 wired network port.',
        exp:'link LED on', meas:'no link', fix:'Check the cable; inspect the port pins and magnetics; reflow if cold-jointed.' },
      { id:'hdmi', name:'HDMI Output', x:-0.05, y:0.30,
        fault:'NO DISPLAY', desc:'Video output to a monitor or TV.',
        exp:'image on screen', meas:'no signal', fix:'Try another cable/monitor; reflow the HDMI connector pins.' },
      { id:'gpio', name:'GPIO Header (40-pin)', x:0.05, y:-0.32,
        fault:'PIN NOT WORKING', desc:'40-pin general-purpose header for add-on boards.',
        exp:'3.3 V on pin 1', meas:'0 V', fix:'Check for bent/shorted pins; verify the 3.3V rail; reflow the header.' }
    ]
    // No custom `diag`: the app auto-builds the diagnostic from the components
    // above, so every question maps to a labelled point on the board.
  }
};

/* Impact factors per repaired board (conservative averages). */
window.IMPACT = { ewastePerRepair: 0.4, co2PerRepair: 12.0, lifePerRepair: 2 };
