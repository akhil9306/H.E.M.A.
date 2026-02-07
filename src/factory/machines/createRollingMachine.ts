import * as THREE from "three";
import { getFactoryMaterials } from "../materials";
import { addWarningStripes } from "../helpers";
import type { RollerParams, FactoryDynamicParts } from "../types";

function updateRollerScreen(params: RollerParams, dynamicParts: FactoryDynamicParts): void {
  const c = dynamicParts.rollerScreenCanvas;
  if (!c) return;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#001a00";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#00ff44";
  ctx.font = "16px monospace";
  ctx.fillText("DIA: " + params.diameter.toFixed(1) + "m", 10, 24);
  ctx.fillText("HGT: " + params.height.toFixed(1) + "m", 10, 46);
  ctx.fillText("R:   " + (params.diameter / 2).toFixed(2) + "m", 10, 68);
  ctx.fillStyle = "#00cc33";
  ctx.font = "bold 14px monospace";
  ctx.fillText("ADAPTOR: SET", 10, 92);
  ctx.fillStyle = "#ffcc00";
  ctx.fillText("STATUS: RUN", 10, 112);
  if (dynamicParts.rollerScreenTex) dynamicParts.rollerScreenTex.needsUpdate = true;
}

export function updateRollerMachine(
  params: RollerParams,
  dynamicParts: FactoryDynamicParts
): void {
  const MATS = getFactoryMaterials();
  const ox = 0;
  const bottomRollerY = 1.15;

  // Adjust top roller position (gap = diameter)
  if (dynamicParts.topRollerRef) {
    const topY = bottomRollerY + params.diameter * 0.5 + 0.47;
    dynamicParts.topRollerRef.position.y = topY;

    // Adjust rear roller
    if (dynamicParts.rearRollerRef) {
      dynamicParts.rearRollerRef.position.y = (bottomRollerY + topY) / 2;
      dynamicParts.rearRollerRef.position.z = 0.3 + params.diameter * 0.3;
    }
  }

  // Rebuild adaptor sleeves (width = height param)
  if (dynamicParts.rollerAdaptorGroup) {
    // Remove old children
    while (dynamicParts.rollerAdaptorGroup.children.length) {
      const ch = dynamicParts.rollerAdaptorGroup.children[0] as THREE.Mesh;
      if (ch.geometry) ch.geometry.dispose();
      dynamicParts.rollerAdaptorGroup.remove(ch);
    }
    const adaptorMat = new THREE.MeshStandardMaterial({
      color: 0x44aa66,
      metalness: 0.6,
      roughness: 0.35,
      transparent: true,
      opacity: 0.85,
    });
    const halfH = params.height / 2;
    for (let side = -1; side <= 1; side += 2) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.05, 8, 24),
        adaptorMat
      );
      ring.position.set(ox + side * halfH, bottomRollerY, 0);
      ring.rotation.y = Math.PI / 2;
      dynamicParts.rollerAdaptorGroup.add(ring);
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.08, 24),
        adaptorMat
      );
      sleeve.rotation.z = Math.PI / 2;
      sleeve.position.set(ox + side * halfH, bottomRollerY, 0);
      dynamicParts.rollerAdaptorGroup.add(sleeve);
      const setScrew = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.06, 6),
        MATS.brass
      );
      setScrew.position.set(ox + side * halfH, bottomRollerY + 0.3, 0);
      dynamicParts.rollerAdaptorGroup.add(setScrew);
    }
  }

  // Rebuild pipe preview
  if (dynamicParts.pipePreviewRef) {
    while (dynamicParts.pipePreviewRef.children.length) {
      const ch = dynamicParts.pipePreviewRef.children[0] as THREE.Mesh;
      if (ch.geometry) ch.geometry.dispose();
      dynamicParts.pipePreviewRef.remove(ch);
    }
    const pipeR = params.diameter / 2;
    const pipeGeo = new THREE.CylinderGeometry(
      pipeR, pipeR, params.height, 32, 1, true, 0, Math.PI * 1.5
    );
    const pipeMat = new THREE.MeshStandardMaterial({
      color: 0x5599cc,
      metalness: 0.85,
      roughness: 0.12,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(ox, bottomRollerY + 0.25 + pipeR, 0);
    pipe.castShadow = true;
    dynamicParts.pipePreviewRef.add(pipe);
  }

  // Update rack indicators
  dynamicParts.rollerRackIndicators.forEach((ind) => {
    const isActive = Math.abs(ind.size - params.diameter) < 0.05;
    (ind.mesh.material as THREE.MeshBasicMaterial).color.setHex(isActive ? 0x00ff44 : 0x333333);
  });

  // Update screen
  updateRollerScreen(params, dynamicParts);
}

export function createRollingMachine(
  scene: THREE.Scene,
  params: RollerParams,
  dynamicParts: FactoryDynamicParts
): THREE.Group {
  const MATS = getFactoryMaterials();
  const G = new THREE.Group();
  const ox = 0;
  const bottomRollerY = 1.15;
  const rollerSegments = 48;

  // Robust base frame with feet
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 0.5, 3.0),
    MATS.greenPaint
  );
  base.position.set(ox, 0.25, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  G.add(base);

  // Adjustable feet
  for (let fx = -1; fx <= 1; fx += 2) {
    for (let fz = -1; fz <= 1; fz += 2) {
      const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.15, 0.06, 12),
        MATS.rubber
      );
      foot.position.set(ox + fx * 2.0, 0.03, fz * 1.3);
      G.add(foot);
    }
  }

  // Side frames (heavy duty housings for bearings)
  for (let side = -1; side <= 1; side += 2) {
    const sideX = ox + side * 1.8;
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 2.5, 2.5),
      MATS.greenPaint
    );
    housing.position.set(sideX, 1.75, 0);
    housing.castShadow = true;
    G.add(housing);

    // Bearing housing blocks
    const bearingYPositions = [1.15, 2.35, 1.75];
    const bearingZOffsets = [0, 0, 0.6];
    bearingYPositions.forEach((by, idx) => {
      const bz = bearingZOffsets[idx] ?? 0;
      const bearingHousing = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.35, 0.35),
        MATS.castIron
      );
      bearingHousing.position.set(sideX, by, bz);
      bearingHousing.castShadow = true;
      G.add(bearingHousing);
      const bearingOuter = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.03, 8, 16),
        MATS.chrome
      );
      bearingOuter.position.set(sideX + side * 0.23, by, bz);
      bearingOuter.rotation.y = Math.PI / 2;
      G.add(bearingOuter);
      const greaseFitting = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.06, 6),
        MATS.brass
      );
      greaseFitting.position.set(sideX + side * 0.23, by + 0.15, bz);
      G.add(greaseFitting);
    });

    // Adjustment screw + handwheel
    const adjScrew = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.6, 12),
      MATS.darkSteel
    );
    adjScrew.position.set(sideX, 3.3, 0);
    adjScrew.castShadow = true;
    G.add(adjScrew);
    const wheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.02, 8, 16),
      MATS.castIron
    );
    wheel.position.set(sideX, 3.6, 0);
    G.add(wheel);
    for (let s = 0; s < 4; s++) {
      const spoke = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.22, 6),
        MATS.castIron
      );
      spoke.position.set(sideX, 3.6, 0);
      spoke.rotation.x = (s / 4) * Math.PI;
      G.add(spoke);
    }
    addWarningStripes(G, sideX, 3.05, 0, 0.36, 0.06, 2.5);
  }

  // === THREE ROLLERS ===
  // Bottom roller (fixed, driven)
  const bottomRoller = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 3.3, rollerSegments),
    MATS.chrome
  );
  bottomRoller.rotation.z = Math.PI / 2;
  bottomRoller.position.set(ox, bottomRollerY, 0);
  bottomRoller.castShadow = true;
  G.add(bottomRoller);

  // Top roller (Y position adjusts with diameter)
  const topRollerY = bottomRollerY + params.diameter * 0.5 + 0.47;
  const topRoller = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 3.3, rollerSegments),
    MATS.chrome
  );
  topRoller.rotation.z = Math.PI / 2;
  topRoller.position.set(ox, topRollerY, 0);
  topRoller.castShadow = true;
  G.add(topRoller);
  dynamicParts.topRollerRef = topRoller;

  // Rear roller (Z offset adjusts with diameter for curvature)
  const rearRollerZ = 0.3 + params.diameter * 0.3;
  const rearRoller = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 3.3, rollerSegments),
    MATS.chrome
  );
  rearRoller.rotation.z = Math.PI / 2;
  rearRoller.position.set(ox, (bottomRollerY + topRollerY) / 2, rearRollerZ);
  rearRoller.castShadow = true;
  G.add(rearRoller);
  dynamicParts.rearRollerRef = rearRoller;

  // Roller groove lines (lathe marks)
  [bottomRoller, topRoller, rearRoller].forEach((roller) => {
    const radiusTop = (roller.geometry as THREE.CylinderGeometry).parameters.radiusTop;
    for (let groove = -1.4; groove <= 1.4; groove += 0.2) {
      const grooveRing = new THREE.Mesh(
        new THREE.TorusGeometry(radiusTop + 0.002, 0.003, 4, 32),
        MATS.darkSteel
      );
      grooveRing.position.copy(roller.position);
      grooveRing.position.x += groove;
      grooveRing.rotation.y = Math.PI / 2;
      G.add(grooveRing);
    }
  });

  // === ADAPTOR SLEEVES on rollers (show working width for height param) ===
  const adaptorGroup = new THREE.Group();
  const adaptorMat = new THREE.MeshStandardMaterial({
    color: 0x44aa66,
    metalness: 0.6,
    roughness: 0.35,
    transparent: true,
    opacity: 0.85,
  });
  // Left and right adaptor rings on bottom roller (constrain sheet width = pipe height)
  const halfHeight = params.height / 2;
  for (let side = -1; side <= 1; side += 2) {
    // Guide ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.05, 8, 24),
      adaptorMat
    );
    ring.position.set(ox + side * halfHeight, bottomRollerY, 0);
    ring.rotation.y = Math.PI / 2;
    adaptorGroup.add(ring);
    // Collar sleeve
    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.08, 24),
      adaptorMat
    );
    sleeve.rotation.z = Math.PI / 2;
    sleeve.position.set(ox + side * halfHeight, bottomRollerY, 0);
    adaptorGroup.add(sleeve);
    // Locking set screw
    const setScrew = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.06, 6),
      MATS.brass
    );
    setScrew.position.set(ox + side * halfHeight, bottomRollerY + 0.3, 0);
    adaptorGroup.add(setScrew);
  }
  G.add(adaptorGroup);
  dynamicParts.rollerAdaptorGroup = adaptorGroup;

  // === ADAPTOR SIZE SELECTOR RACK (side of machine) ===
  const rackGroup = new THREE.Group();
  // Rack frame
  const rackFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 1.4, 0.6),
    MATS.darkSteel
  );
  rackFrame.position.set(ox + 2.35, 1.5, -1.3);
  rackFrame.castShadow = true;
  rackGroup.add(rackFrame);
  // Rack label
  const rackLabelCanvas = document.createElement("canvas");
  rackLabelCanvas.width = 128;
  rackLabelCanvas.height = 32;
  const rlc = rackLabelCanvas.getContext("2d")!;
  rlc.fillStyle = "#2c3e50";
  rlc.fillRect(0, 0, 128, 32);
  rlc.fillStyle = "#eee";
  rlc.font = "bold 12px Arial";
  rlc.fillText("ADAPTOR SIZES", 8, 22);
  const rackLabelTex = new THREE.CanvasTexture(rackLabelCanvas);
  const rackLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.12),
    new THREE.MeshBasicMaterial({ map: rackLabelTex })
  );
  rackLabel.position.set(ox + 2.42, 2.25, -1.3);
  rackLabel.rotation.y = -Math.PI / 2;
  rackGroup.add(rackLabel);

  // Size adaptor pegs on rack (different diameters)
  const adapterSizes = [0.3, 0.5, 0.8, 1.0, 1.5, 2.0];
  dynamicParts.rollerRackIndicators = [];
  adapterSizes.forEach((size, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const pz = -1.1 - col * 0.25;
    const py = 0.95 + row * 0.4;

    // Adaptor ring on peg
    const rScale = 0.06 + size * 0.04;
    const adRing = new THREE.Mesh(
      new THREE.TorusGeometry(rScale, 0.015, 6, 16),
      new THREE.MeshStandardMaterial({ color: 0x44aa66, metalness: 0.6, roughness: 0.3 })
    );
    adRing.position.set(ox + 2.42, py, pz);
    adRing.rotation.y = Math.PI / 2;
    rackGroup.add(adRing);

    // Peg
    const peg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.1, 6),
      MATS.steel
    );
    peg.rotation.x = Math.PI / 2;
    peg.position.set(ox + 2.42, py, pz);
    rackGroup.add(peg);

    // Size label
    const sLabelCanvas = document.createElement("canvas");
    sLabelCanvas.width = 48;
    sLabelCanvas.height = 24;
    const slc = sLabelCanvas.getContext("2d")!;
    slc.fillStyle = "#333";
    slc.fillRect(0, 0, 48, 24);
    slc.fillStyle = "#fff";
    slc.font = "14px monospace";
    slc.fillText(size.toFixed(1), 6, 18);
    const sLabelTex = new THREE.CanvasTexture(sLabelCanvas);
    const sLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 0.06),
      new THREE.MeshBasicMaterial({ map: sLabelTex })
    );
    sLabel.position.set(ox + 2.42, py - 0.12, pz);
    sLabel.rotation.y = -Math.PI / 2;
    rackGroup.add(sLabel);

    // Active indicator LED (lights up when this size is selected)
    const indicator = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 8, 8),
      new THREE.MeshBasicMaterial({ color: size === params.diameter ? 0x00ff44 : 0x333333 })
    );
    indicator.position.set(ox + 2.42, py + 0.1, pz);
    rackGroup.add(indicator);
    dynamicParts.rollerRackIndicators.push({ mesh: indicator, size });
  });
  G.add(rackGroup);

  // === PIPE PREVIEW (partial cylinder being formed between rollers) ===
  const pipePreviewGroup = new THREE.Group();
  const pipeR = params.diameter / 2;
  const pipeGeo = new THREE.CylinderGeometry(
    pipeR, pipeR, params.height, 32, 1, true, 0, Math.PI * 1.5
  );
  const pipeMat = new THREE.MeshStandardMaterial({
    color: 0x5599cc,
    metalness: 0.85,
    roughness: 0.12,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7,
  });
  const pipePreview = new THREE.Mesh(pipeGeo, pipeMat);
  pipePreview.rotation.z = Math.PI / 2;
  pipePreview.position.set(ox, bottomRollerY + 0.25 + pipeR, 0);
  pipePreview.castShadow = true;
  pipePreviewGroup.add(pipePreview);
  G.add(pipePreviewGroup);
  dynamicParts.pipePreviewRef = pipePreviewGroup;

  // === DRIVE MOTOR ===
  const motorBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.6, 24),
    MATS.greenPaint
  );
  motorBody.rotation.z = Math.PI / 2;
  motorBody.position.set(ox - 2.3, 1.15, 0);
  motorBody.castShadow = true;
  G.add(motorBody);
  const endBell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.37, 0.35, 0.08, 24),
    MATS.castIron
  );
  endBell.rotation.z = Math.PI / 2;
  endBell.position.set(ox - 2.62, 1.15, 0);
  G.add(endBell);
  const coupling = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16),
    MATS.steel
  );
  coupling.rotation.z = Math.PI / 2;
  coupling.position.set(ox - 1.92, 1.15, 0);
  G.add(coupling);
  for (let f = 0; f < 12; f++) {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.7, 0.04),
      MATS.greenPaint
    );
    const angle = (f / 12) * Math.PI * 2;
    fin.position.set(ox - 2.3, 1.15 + Math.cos(angle) * 0.36, Math.sin(angle) * 0.36);
    fin.rotation.x = angle;
    G.add(fin);
  }
  const jBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.12, 0.1),
    MATS.castIron
  );
  jBox.position.set(ox - 2.3, 1.52, 0);
  G.add(jBox);

  // Gearbox
  const gearbox = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.5, 0.4),
    MATS.castIron
  );
  gearbox.position.set(ox - 1.95, 1.15, 0);
  gearbox.castShadow = true;
  G.add(gearbox);

  // === CONTROL PANEL with live screen ===
  const panelStand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8),
    MATS.darkSteel
  );
  panelStand.position.set(ox + 2.6, 1.5, 0.8);
  G.add(panelStand);
  const panelBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.65, 0.12),
    MATS.darkSteel
  );
  panelBox.position.set(ox + 2.6, 2.3, 0.8);
  panelBox.rotation.x = -0.3;
  panelBox.castShadow = true;
  G.add(panelBox);

  // Live screen (updates with parameter changes)
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 256;
  screenCanvas.height = 128;
  dynamicParts.rollerScreenCanvas = screenCanvas;
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  dynamicParts.rollerScreenTex = screenTex;
  updateRollerScreen(params, dynamicParts);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.35, 0.2),
    new THREE.MeshBasicMaterial({ map: screenTex })
  );
  screen.position.set(ox + 2.6, 2.4, 0.87);
  screen.rotation.x = -0.3;
  G.add(screen);

  // Indicator lights
  [0x00ff00, 0xffaa00, 0xff0000].forEach((c, i) => {
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 8),
      new THREE.MeshBasicMaterial({ color: c })
    );
    light.position.set(ox + 2.42 + i * 0.08, 2.56, 0.86);
    G.add(light);
  });

  // Emergency stop
  const eStop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16),
    new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x330000, emissiveIntensity: 0.4 })
  );
  eStop.rotation.x = Math.PI / 2 - 0.3;
  eStop.position.set(ox + 2.6, 2.05, 0.84);
  G.add(eStop);

  // Label
  const lCanvas = document.createElement("canvas");
  lCanvas.width = 256;
  lCanvas.height = 64;
  const lc = lCanvas.getContext("2d")!;
  lc.fillStyle = "#1f7a3f";
  lc.fillRect(0, 0, 256, 64);
  lc.fillStyle = "#fff";
  lc.font = "bold 18px Arial";
  lc.fillText("3-ROLLER BENDER", 20, 40);
  const lTex = new THREE.CanvasTexture(lCanvas);
  const lMat = new THREE.MeshStandardMaterial({ map: lTex, metalness: 0.4, roughness: 0.5 });
  const lMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.02), lMat);
  lMesh.position.set(ox, 0.35, 1.51);
  G.add(lMesh);

  scene.add(G);
  return G;
}
