# AR PCB Repair Assistant — WebAR (SDG 12)

A browser-based Augmented Reality tool that overlays interactive repair guidance onto a
physical Raspberry Pi circuit board. It supports **SDG 12.5** (responsible consumption) by
helping people **repair boards instead of discarding them**, reducing e-waste.

No installation — it runs in the phone browser. Marker-based tracking (ArUco) keeps the
overlay aligned to the board.

---

## How to run

The camera requires a **secure context** (HTTPS or `localhost`). Two ways:

### A. Locally (for testing)
```bash
# from this webapp/ folder, any static server works, e.g.:
npx serve .
# then open the shown http://localhost:PORT on the SAME machine,
# or use your phone with a tunnel (e.g. ngrok) for camera access.
```

### B. Deploy to GitHub Pages (recommended)
```bash
git init
git add .
git commit -m "AR PCB Repair Assistant"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
# GitHub -> Settings -> Pages -> Source: main / root
```
Open `https://<you>.github.io/<repo>/` on your phone.

---

## Set up the marker

1. Open **`marker.html`** in a browser.
2. Print the marker (ARUCO dictionary, id 0).
3. Place it flat on or beside the board, fully visible to the camera. Bigger = steadier.

---

## Using the app

1. Open the app link, tap **Start AR Repair**, allow the camera.
2. Point at the board with the marker in view → wait for **Board Locked**.
3. **Tap a glowing component** to see its fault, expected/measured values, and the fix.
4. Tap **Start Diagnosis** and answer the questions to walk the troubleshooting tree.
5. Open **📊** for the live impact dashboard (e-waste and CO₂ saved).
6. Open **🧊** to rotate the 3D board model.

---

## Project structure
```
webapp/
├── index.html        UI structure + library includes
├── css/styles.css    styling
├── js/
│   ├── data.js       components, diagnostic decision tree, impact factors (EDIT THIS)
│   └── app.js        AR engine (detect + pose + three.js render) and all UI logic
├── assets/pcb.glb    Draco-compressed 3D board model (~1 MB)
├── marker.html       printable ArUco marker generator
└── README.md
```

## How it works (technical)
- **Tracking:** `js-aruco2` detects the ARUCO marker each frame and returns its corners.
- **Pose:** `POS.Posit` turns the corners into a 3D rotation + translation.
- **Render:** `three.js` places the board model and component hotspots at that pose, so
  they stay glued to the physical board.
- **Interaction:** tapping ray-casts against the hotspots; the diagnostic flow is a small
  state machine in `data.js`.
- **Education:** the intro and the impact dashboard quantify the SDG-12 benefit.

## Customising for another board
Edit **`js/data.js`**:
- `COMPONENTS` — add each part with its marker-plane `x/y` (range about −0.5…0.5) and fault data.
- `DIAG` — edit the diagnostic decision tree (questions, branches, fixes).
- `IMPACT` — adjust the per-repair e-waste / CO₂ factors.

## Libraries
- [js-aruco2](https://github.com/damianofalcioni/js-aruco2) — marker detection + pose
- [three.js](https://threejs.org/) — WebGL 3D rendering
- [Draco](https://google.github.io/draco/) / [glTF-Transform](https://gltf-transform.dev/) — model compression
