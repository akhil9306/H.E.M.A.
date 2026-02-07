import * as THREE from "three";
import { getFactoryMaterials } from "../materials";
import { addWarningStripes } from "../helpers";
import type { PressParams, FactoryAnimParts, FactoryDynamicParts } from "../types";

function buildDieGeometry(group: THREE.Group, ox: number, params: PressParams): void {
  const MATS = getFactoryMaterials();
  const tr = params.topRadius;
  const br = params.bottomRadius;
  const fh = params.frustrumHeight;

  // Outer die shell (frustrum shape)
  const dieOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(tr * 0.8, br * 0.8, fh * 0.9, 32),
    MATS.chrome
  );
  dieOuter.position.set(ox, 1.5 + fh * 0.45, 0);
  dieOuter.castShadow = true;
  group.add(dieOuter);

  // Die shoulder ring (where it seats into mount)
  const shoulderRing = new THREE.Mesh(
    new THREE.TorusGeometry(br * 0.8 + 0.06, 0.03, 8, 32),
    MATS.brass
  );
  shoulderRing.position.set(ox, 1.5, 0);
  shoulderRing.rotation.x = Math.PI / 2;
  group.add(shoulderRing);

  // Die top ring
  const topRing = new THREE.Mesh(
    new THREE.TorusGeometry(tr * 0.8 + 0.04, 0.02, 8, 32),
    MATS.darkSteel
  );
  topRing.position.set(ox, 1.5 + fh * 0.9, 0);
  topRing.rotation.x = Math.PI / 2;
  group.add(topRing);

  // Quick-change adaptor plate (flat disk at top of die)
  const adaptorPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(br * 0.5, br * 0.5, 0.06, 24),
    MATS.darkSteel
  );
  adaptorPlate.position.set(ox, 1.5 + fh * 0.9 + 0.04, 0);
  group.add(adaptorPlate);

  // Keyway slots on adaptor plate (for alignment)
  for (let k = 0; k < 3; k++) {
    const ka = (k / 3) * Math.PI * 2;
    const keySlot = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.07, 0.015),
      MATS.castIron
    );
    keySlot.position.set(
      ox + Math.cos(ka) * br * 0.4,
      1.5 + fh * 0.9 + 0.04,
      Math.sin(ka) * br * 0.4
    );
    keySlot.rotation.y = ka;
    group.add(keySlot);
  }

  // Die size engraving (text on the die body)
  const engCanvas = document.createElement("canvas");
  engCanvas.width = 128;
  engCanvas.height = 64;
  const ec = engCanvas.getContext("2d")!;
  ec.fillStyle = "#b0b8c0";
  ec.fillRect(0, 0, 128, 64);
  ec.fillStyle = "#333";
  ec.font = "bold 16px monospace";
  ec.fillText(tr.toFixed(1) + "/" + br.toFixed(1), 10, 28);
  ec.font = "12px monospace";
  ec.fillText("H:" + fh.toFixed(1) + "m", 10, 50);
  const engTex = new THREE.CanvasTexture(engCanvas);
  const engLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.25, 0.12),
    new THREE.MeshStandardMaterial({ map: engTex, metalness: 0.6, roughness: 0.3 })
  );
  engLabel.position.set(ox, 1.5 + fh * 0.45, br * 0.8 + 0.01);
  group.add(engLabel);
}

function buildFrustrumPreview(group: THREE.Group, ox: number, params: PressParams): void {
  const tr = params.topRadius;
  const br = params.bottomRadius;
  const fh = params.frustrumHeight;

  const frustrumGeo = new THREE.CylinderGeometry(tr, br, fh, 32, 1, true);
  const frustrumMat = new THREE.MeshStandardMaterial({
    color: 0xddaa55,
    metalness: 0.8,
    roughness: 0.15,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.65,
  });
  const frustrum = new THREE.Mesh(frustrumGeo, frustrumMat);
  frustrum.position.set(ox, 0.88 + fh / 2, 0);
  frustrum.castShadow = true;
  group.add(frustrum);

  // Top edge ring
  const topEdge = new THREE.Mesh(
    new THREE.TorusGeometry(tr, 0.01, 6, 32),
    frustrumMat
  );
  topEdge.position.set(ox, 0.88 + fh, 0);
  topEdge.rotation.x = Math.PI / 2;
  group.add(topEdge);

  // Bottom edge ring
  const btmEdge = new THREE.Mesh(
    new THREE.TorusGeometry(br, 0.01, 6, 32),
    frustrumMat
  );
  btmEdge.position.set(ox, 0.88, 0);
  btmEdge.rotation.x = Math.PI / 2;
  group.add(btmEdge);
}

function updatePressScreen(params: PressParams, dynamicParts: FactoryDynamicParts): void {
  const c = dynamicParts.pressScreenCanvas;
  if (!c) return;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#001a00";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#00ff44";
  ctx.font = "14px monospace";
  ctx.fillText("TOP R: " + params.topRadius.toFixed(1) + "m", 8, 22);
  ctx.fillText("BTM R: " + params.bottomRadius.toFixed(1) + "m", 8, 42);
  ctx.fillText("HGT:   " + params.frustrumHeight.toFixed(1) + "m", 8, 62);
  ctx.fillStyle = "#00cc33";
  ctx.font = "bold 13px monospace";
  ctx.fillText("DIE: LOADED", 8, 84);
  ctx.fillStyle = "#ffcc00";
  ctx.fillText("PRESSURE: OK", 8, 104);
  if (dynamicParts.pressScreenTex) dynamicParts.pressScreenTex.needsUpdate = true;
}

export function updateFrustrumPress(
  params: PressParams,
  dynamicParts: FactoryDynamicParts
): void {
  const ox = 6;

  // Rebuild die geometry
  if (dynamicParts.dieGroup) {
    while (dynamicParts.dieGroup.children.length) {
      const ch = dynamicParts.dieGroup.children[0] as THREE.Mesh;
      if (ch.geometry) ch.geometry.dispose();
      if (ch.material && (ch.material as THREE.MeshStandardMaterial).map) {
        (ch.material as THREE.MeshStandardMaterial).map!.dispose();
      }
      dynamicParts.dieGroup.remove(ch);
    }
    buildDieGeometry(dynamicParts.dieGroup, ox, params);
  }

  // Rebuild frustrum preview
  if (dynamicParts.frustrumPreviewRef) {
    while (dynamicParts.frustrumPreviewRef.children.length) {
      const ch = dynamicParts.frustrumPreviewRef.children[0] as THREE.Mesh;
      if (ch.geometry) ch.geometry.dispose();
      dynamicParts.frustrumPreviewRef.remove(ch);
    }
    buildFrustrumPreview(dynamicParts.frustrumPreviewRef, ox, params);
  }

  // Update rack indicators
  dynamicParts.pressRackIndicators.forEach((ind) => {
    const isActive =
      Math.abs(ind.tr - params.topRadius) < 0.05 &&
      Math.abs(ind.br - params.bottomRadius) < 0.05;
    (ind.mesh.material as THREE.MeshBasicMaterial).color.setHex(isActive ? 0x00ff44 : 0x333333);
  });

  // Update screen
  updatePressScreen(params, dynamicParts);
}

export function createFrustrumPress(
  scene: THREE.Scene,
  params: PressParams,
  animParts: FactoryAnimParts,
  dynamicParts: FactoryDynamicParts
): THREE.Group {
  const MATS = getFactoryMaterials();
  const G = new THREE.Group();
  const ox = 6;

  // Massive base (layered)
  const baseBottom = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 0.4, 4.0),
    MATS.castIron
  );
  baseBottom.position.set(ox, 0.2, 0);
  baseBottom.castShadow = true;
  baseBottom.receiveShadow = true;
  G.add(baseBottom);
  const baseTop = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 0.35, 3.5),
    MATS.yellowPaint
  );
  baseTop.position.set(ox, 0.575, 0);
  baseTop.castShadow = true;
  G.add(baseTop);
  addWarningStripes(G, ox, 0.4, 2.01, 4.0, 0.35, 0.02);
  addWarningStripes(G, ox, 0.4, -2.01, 4.0, 0.35, 0.02);

  // Circular work table
  const tableBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.4, 0.12, 48),
    MATS.steel
  );
  tableBase.position.set(ox, 0.81, 0);
  tableBase.castShadow = true;
  G.add(tableBase);
  for (let r = 0.3; r <= 1.2; r += 0.3) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.008, 6, 48),
      MATS.darkSteel
    );
    ring.position.set(ox, 0.88, 0);
    ring.rotation.x = Math.PI / 2;
    G.add(ring);
  }
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const slot = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.015, 0.04),
      MATS.darkSteel
    );
    slot.position.set(ox + Math.cos(angle) * 0.6, 0.88, Math.sin(angle) * 0.6);
    slot.rotation.y = angle;
    G.add(slot);
  }

  // Four columns
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const cx = Math.cos(angle) * 1.5;
    const cz = Math.sin(angle) * 1.5;
    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 3.8, 20),
      MATS.chrome
    );
    column.position.set(ox + cx, 2.65, cz);
    column.castShadow = true;
    G.add(column);
    for (const cy of [0.9, 4.4]) {
      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.08, 20),
        MATS.darkSteel
      );
      collar.position.set(ox + cx, cy, cz);
      G.add(collar);
    }
    const grease = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 6, 6),
      MATS.brass
    );
    grease.position.set(
      ox + cx + Math.cos(angle) * 0.16,
      2.5,
      cz + Math.sin(angle) * 0.16
    );
    G.add(grease);
  }

  // Top plate (crown)
  const crown = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 0.45, 3.5),
    MATS.yellowPaint
  );
  crown.position.set(ox, 4.65, 0);
  crown.castShadow = true;
  G.add(crown);
  for (let r = -1; r <= 1; r++) {
    const rib = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.15, 0.08),
      MATS.castIron
    );
    rib.position.set(ox, 4.85, r * 1.0);
    G.add(rib);
  }

  // Main hydraulic ram
  const mainCylBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 1.2, 32),
    MATS.hydraulicRed
  );
  mainCylBody.position.set(ox, 4.0, 0);
  mainCylBody.castShadow = true;
  G.add(mainCylBody);
  const ramCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.08, 32),
    MATS.darkSteel
  );
  ramCap.position.set(ox, 4.6, 0);
  G.add(ramCap);
  const pistonRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 1.0, 24),
    MATS.hydraulicChrome
  );
  pistonRod.position.set(ox, 2.9, 0);
  pistonRod.castShadow = true;
  G.add(pistonRod);

  // Press ram head (slide)
  const ramHead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.3, 32),
    MATS.castIron
  );
  ramHead.position.set(ox, 2.35, 0);
  ramHead.castShadow = true;
  G.add(ramHead);
  animParts.ramRef = ramHead;

  // === QUICK-CHANGE DIE MOUNT (T-slot + locking ring) ===
  const dieMountRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.04, 8, 32),
    MATS.darkSteel
  );
  dieMountRing.position.set(ox, 2.15, 0);
  dieMountRing.rotation.x = Math.PI / 2;
  G.add(dieMountRing);
  // Locking bolts on mount
  for (let lb = 0; lb < 6; lb++) {
    const lba = (lb / 6) * Math.PI * 2;
    const lbolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.05, 6),
      MATS.brass
    );
    lbolt.position.set(ox + Math.cos(lba) * 0.75, 2.15, Math.sin(lba) * 0.75);
    G.add(lbolt);
  }
  // Quick-release lever
  const lever = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.04, 0.04),
    MATS.redPaint
  );
  lever.position.set(ox + 0.9, 2.15, 0);
  G.add(lever);
  const leverKnob = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 8, 8),
    MATS.redPaint
  );
  leverKnob.position.set(ox + 1.06, 2.15, 0);
  G.add(leverKnob);

  // === DYNAMIC FORMING DIE (changes with topRadius/bottomRadius/frustrumHeight) ===
  const dieGroup = new THREE.Group();
  buildDieGeometry(dieGroup, ox, params);
  G.add(dieGroup);
  dynamicParts.dieGroup = dieGroup;

  // === FRUSTRUM PREVIEW on the table (the product being formed) ===
  const frustrumPreviewGroup = new THREE.Group();
  buildFrustrumPreview(frustrumPreviewGroup, ox, params);
  G.add(frustrumPreviewGroup);
  dynamicParts.frustrumPreviewRef = frustrumPreviewGroup;

  // === INTERCHANGEABLE DIE RACK (showing available die sets) ===
  const dieRack = new THREE.Group();
  // Rack shelf structure
  const shelfFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 2.2, 1.2),
    MATS.darkSteel
  );
  shelfFrame.position.set(ox - 2.4, 1.5, -0.2);
  shelfFrame.castShadow = true;
  dieRack.add(shelfFrame);
  // Shelves
  for (let sh = 0; sh < 3; sh++) {
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.03, 1.1),
      MATS.steel
    );
    shelf.position.set(ox - 2.25, 0.65 + sh * 0.7, -0.2);
    dieRack.add(shelf);
  }
  // Rack label
  const dieRackLblCanvas = document.createElement("canvas");
  dieRackLblCanvas.width = 128;
  dieRackLblCanvas.height = 32;
  const drc = dieRackLblCanvas.getContext("2d")!;
  drc.fillStyle = "#2c3e50";
  drc.fillRect(0, 0, 128, 32);
  drc.fillStyle = "#eee";
  drc.font = "bold 11px Arial";
  drc.fillText("DIE SETS", 20, 22);
  const dieRackTex = new THREE.CanvasTexture(dieRackLblCanvas);
  const dieRackLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.45, 0.1),
    new THREE.MeshBasicMaterial({ map: dieRackTex })
  );
  dieRackLabel.position.set(ox - 2.08, 2.6, -0.2);
  dieRackLabel.rotation.y = Math.PI / 2;
  dieRack.add(dieRackLabel);

  // Die set models on the rack (miniature frustrum dies)
  const dieSets = [
    { tr: 0.2, br: 0.4, h: 0.3, label: "S" },
    { tr: 0.3, br: 0.6, h: 0.5, label: "M" },
    { tr: 0.5, br: 0.8, h: 0.7, label: "L" },
    { tr: 0.4, br: 1.0, h: 0.8, label: "XL" },
    { tr: 0.6, br: 1.2, h: 1.0, label: "XXL" },
  ];
  dynamicParts.pressRackIndicators = [];
  dieSets.forEach((ds, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const dsx = ox - 2.15;
    const dsy = 0.72 + row * 0.7;
    const dsz = -0.5 + col * 0.55;

    // Miniature die
    const miniScale = 0.15;
    const miniDie = new THREE.Mesh(
      new THREE.CylinderGeometry(
        ds.tr * miniScale,
        ds.br * miniScale,
        ds.h * miniScale * 1.5,
        16
      ),
      new THREE.MeshStandardMaterial({ color: 0xc0c0d0, metalness: 0.9, roughness: 0.15 })
    );
    miniDie.position.set(dsx, dsy + ds.h * miniScale, dsz);
    dieRack.add(miniDie);

    // Size label
    const dsLblCanvas = document.createElement("canvas");
    dsLblCanvas.width = 32;
    dsLblCanvas.height = 20;
    const dslc = dsLblCanvas.getContext("2d")!;
    dslc.fillStyle = "#444";
    dslc.fillRect(0, 0, 32, 20);
    dslc.fillStyle = "#ff0";
    dslc.font = "bold 14px Arial";
    dslc.fillText(ds.label, 4, 16);
    const dsLblTex = new THREE.CanvasTexture(dsLblCanvas);
    const dsLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, 0.06),
      new THREE.MeshBasicMaterial({ map: dsLblTex })
    );
    dsLabel.position.set(dsx + 0.01, dsy - 0.04, dsz);
    dsLabel.rotation.y = Math.PI / 2;
    dieRack.add(dsLabel);

    // Active indicator
    const isActive =
      Math.abs(ds.tr - params.topRadius) < 0.05 &&
      Math.abs(ds.br - params.bottomRadius) < 0.05;
    const ind = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 8, 8),
      new THREE.MeshBasicMaterial({ color: isActive ? 0x00ff44 : 0x333333 })
    );
    ind.position.set(dsx + 0.01, dsy + ds.h * miniScale * 2 + 0.05, dsz);
    dieRack.add(ind);
    dynamicParts.pressRackIndicators.push({ mesh: ind, tr: ds.tr, br: ds.br });
  });
  G.add(dieRack);

  // Hydraulic hoses
  for (let h = 0; h < 2; h++) {
    const hoseAngle = h * Math.PI;
    const hx = Math.cos(hoseAngle) * 0.6;
    const hz = Math.sin(hoseAngle) * 0.6;
    for (let seg = 0; seg < 6; seg++) {
      const t = seg / 5;
      const hoseSeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.25, 6),
        MATS.rubber
      );
      hoseSeg.position.set(
        ox + hx * (1 + t * 0.3),
        3.5 + t * 1.0,
        hz * (1 + t * 0.3)
      );
      hoseSeg.rotation.z = t * 0.3;
      G.add(hoseSeg);
    }
  }

  // Hydraulic power unit
  const hpuBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.0, 0.6),
    MATS.yellowPaint
  );
  hpuBody.position.set(ox + 2.5, 0.9, -1.5);
  hpuBody.castShadow = true;
  G.add(hpuBody);
  const hpuMotor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.4, 16),
    MATS.greenPaint
  );
  hpuMotor.position.set(ox + 2.5, 1.55, -1.5);
  hpuMotor.castShadow = true;
  G.add(hpuMotor);
  const filler = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12),
    MATS.brass
  );
  filler.position.set(ox + 2.5, 1.42, -1.25);
  G.add(filler);

  // Pressure gauge
  const gaugeBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.04, 20),
    MATS.chrome
  );
  gaugeBody.rotation.x = Math.PI / 2;
  gaugeBody.position.set(ox - 1.8, 2.5, 0);
  G.add(gaugeBody);
  const gaugeFace = new THREE.Mesh(
    new THREE.CircleGeometry(0.09, 20),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  gaugeFace.position.set(ox - 1.8, 2.5, 0.03);
  G.add(gaugeFace);

  // === CONTROL PANEL with live screen ===
  const cpStand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8),
    MATS.darkSteel
  );
  cpStand.position.set(ox - 2.0, 0.85, 1.5);
  G.add(cpStand);
  const cpanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.9, 0.12),
    MATS.darkSteel
  );
  cpanel.position.set(ox - 2.0, 1.6, 1.5);
  cpanel.rotation.y = 0.3;
  cpanel.castShadow = true;
  G.add(cpanel);

  // Live screen
  const pressScreenCanvas = document.createElement("canvas");
  pressScreenCanvas.width = 256;
  pressScreenCanvas.height = 128;
  dynamicParts.pressScreenCanvas = pressScreenCanvas;
  const pressScreenTex = new THREE.CanvasTexture(pressScreenCanvas);
  dynamicParts.pressScreenTex = pressScreenTex;
  updatePressScreen(params, dynamicParts);
  const pressScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.22),
    new THREE.MeshBasicMaterial({ map: pressScreenTex })
  );
  pressScreen.position.set(ox - 1.97, 1.7, 1.56);
  pressScreen.rotation.y = 0.3;
  G.add(pressScreen);

  // Label
  const lCanvas = document.createElement("canvas");
  lCanvas.width = 256;
  lCanvas.height = 64;
  const lc = lCanvas.getContext("2d")!;
  lc.fillStyle = "#d4a017";
  lc.fillRect(0, 0, 256, 64);
  lc.fillStyle = "#222";
  lc.font = "bold 18px Arial";
  lc.fillText("FRUSTRUM PRESS", 20, 40);
  const lTex = new THREE.CanvasTexture(lCanvas);
  const lMat = new THREE.MeshStandardMaterial({ map: lTex, metalness: 0.4, roughness: 0.5 });
  const lMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.02), lMat);
  lMesh.position.set(ox, 0.35, 2.01);
  G.add(lMesh);

  scene.add(G);
  return G;
}
