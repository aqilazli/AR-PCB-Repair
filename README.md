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

The app uses the **ARUCO_MIP_36h12** dictionary (250 unique ids → up to 250 boards).
Each board uses one id; the prototype's Raspberry Pi is **id 0**.

1. Open **`marker_id0.svg`** in a browser and print it (`marker_id1.svg` is a spare id 1).
2. Generate more ids in the project root: `node generate_marker.js <id>` → `marker_id<id>.svg`.
3. Print on paper (not shown on a screen), keep the white border, make it big (≥6 cm),
   and place it flat on or beside the board, fully visible. Bigger = steadier.

---

## Using the app

1. Open the app link, tap **Start AR Repair**, allow the camera.
2. Point at the board with the marker in view → wait for **Board Locked**.
3. **Tap a glowing component** to see its fault, expected/measured values, and the fix.
4. Tap **Start Diagnosis** and answer the questions to walk the troubleshooting tree.
5. Drag with **one finger** to rotate/flip the model, **two fingers** to zoom.
6. Open **📊** impact dashboard, **📐** schematic, **📝** board-library editor.

---

## Project structure
```
webapp/
├── index.html         UI structure + library includes
├── css/styles.css     styling
├── js/
│   ├── data.js        DEFAULT board library (edit or use the in-app editor)
│   ├── library.js     board CRUD · localStorage · JSON/CSV export · import
│   ├── diagnostic.js  builds the SOP decision tree from a board
│   ├── state.js       shared current-board + counters
│   ├── ar-core.js     three.js scene + render loop
│   ├── ar-model.js    GLB load · rotate/zoom
│   ├── ar-hotspots.js component markers + tap hit-test
│   ├── ar-tracking.js camera + ArUco detect + pose smoothing
│   ├── ar-controls.js touch input (rotate/zoom/tap)
│   ├── ui-info.js     component info panel
│   ├── ui-sop.js      diagnostic step-through
│   ├── ui-dashboard.js impact dashboard + telemetry
│   ├── ui-editor.js   board-library editor (📝)
│   └── main.js        wiring / entry point
├── assets/3d/pcb.glb            3D board model (Draco + WebP, ~1 MB)
├── assets/docs/*.pdf            board schematics
├── marker_id0.svg / marker_id1.svg  printable ArUco markers (ARUCO_MIP_36h12)
└── README.md
```

## How it works (technical)
- **Tracking:** `js-aruco2` detects the ARUCO_MIP_36h12 marker each frame and returns its corners.
- **Pose:** `POS.Posit` turns the corners into a 3D rotation + translation; the group is eased onto it (no jitter).
- **Render:** `three.js` places the board model + component hotspots at that pose.
- **Board switching:** the detected marker **id** selects the board from the library; an unknown id prompts the user to scan a registered board.
- **Education:** the intro + impact dashboard quantify the SDG-12 benefit.

## Adding / editing a board (no coding)
The board library is a bundled JSON (`js/data.js`) plus your edits saved in the browser. Use the **📝 editor**:

1. Put the model in `assets/3d/` and the schematic in `assets/docs/`.
   (Static hosting cannot upload files — they must be committed with git.)
2. In **📝**: click **+ Board**, enter the **ArUco marker id** and name.
3. Fill **GLB path** and **Schematic path**, click **Save board info**.
   (Use **Preview GLB file** to test a model in the current session.)
4. Add each faulty part with **+ Add component** (id, name, x/y, fault, expected,
   measured, and the **fix** = the repair method). These build the diagnostic flow.
5. Print the marker for that id: `node generate_marker.js <id>` (in the project root).
6. **⬇ JSON** to back up / share the library, **⬇ CSV** for a spreadsheet view.
   **⬆ Import JSON** restores a saved library. **Reset** returns to bundled defaults.

To make new boards permanent for everyone, paste the exported JSON into `js/data.js`
(as `window.DEFAULT_BOARDS`) and commit, or keep distributing the JSON via Import.

## Hosting board files
Keep `.glb` and schematics in this repo's `assets/` (reliable, CORS-safe, free).
Google Drive is **not** recommended for the GLB (CORS + scan interstitial break loading).
If you must host externally, use a CORS-friendly URL (e.g. jsDelivr over your GitHub repo)
and paste it into the GLB/Schematic path field.

## Libraries
- [js-aruco2](https://github.com/damianofalcioni/js-aruco2) — marker detection + pose
- [three.js](https://threejs.org/) — WebGL 3D rendering
- [Draco](https://google.github.io/draco/) / [glTF-Transform](https://gltf-transform.dev/) — model compression
