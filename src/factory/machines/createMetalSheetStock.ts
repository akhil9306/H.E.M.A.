import * as THREE from "three";
import { getFactoryMaterials } from "../materials";

export function createMetalSheetStock(scene: THREE.Scene): THREE.Group {
  const MATS = getFactoryMaterials();
  const G = new THREE.Group();
  const ox = -12;

  // Heavy-duty steel table frame with I-beam legs
  const legPositions: [number, number][] = [[-2.5, -1.5], [2.5, -1.5], [-2.5, 1.5], [2.5, 1.5]];
  legPositions.forEach(([lx, lz]) => {
    // Square tube legs
    const outerLeg = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.8, 0.2),
      MATS.darkSteel
    );
    outerLeg.position.set(ox + lx, 0.4, lz);
    outerLeg.castShadow = true;
    G.add(outerLeg);
    // foot pad
    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.18, 0.04, 12),
      MATS.rubber
    );
    foot.position.set(ox + lx, 0.02, lz);
    G.add(foot);
  });

  // Cross braces between legs
  for (let side = -1; side <= 1; side += 2) {
    const brace = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.08, 0.08),
      MATS.darkSteel
    );
    brace.position.set(ox, 0.25, side * 1.5);
    brace.castShadow = true;
    G.add(brace);
  }
  const crossBrace = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 2.8),
    MATS.darkSteel
  );
  crossBrace.position.set(ox, 0.25, 0);
  G.add(crossBrace);

  // Heavy table top with chamfered edges (two-layer)
  const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.15, 4),
    MATS.steel
  );
  tableTop.position.set(ox, 0.85, 0);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  G.add(tableTop);

  // edge trim
  const edgeTrim = new THREE.Mesh(
    new THREE.BoxGeometry(6.1, 0.06, 4.1),
    MATS.darkSteel
  );
  edgeTrim.position.set(ox, 0.78, 0);
  G.add(edgeTrim);

  // Stack of metal sheets with realistic spacing and slight variation
  for (let i = 0; i < 8; i++) {
    const sheetW = 5.2 - Math.random() * 0.1;
    const sheetD = 3.2 - Math.random() * 0.1;
    const sheetGeo = new THREE.BoxGeometry(sheetW, 0.025, sheetD);
    const hue = 0.58 + Math.random() * 0.04;
    const sheetMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, 0.5, 0.55),
      metalness: 0.92,
      roughness: 0.08 + Math.random() * 0.05,
    });
    const sheet = new THREE.Mesh(sheetGeo, sheetMat);
    sheet.position.set(
      ox + (Math.random() - 0.5) * 0.05,
      0.93 + i * 0.03,
      (Math.random() - 0.5) * 0.05
    );
    sheet.rotation.y = (Math.random() - 0.5) * 0.005;
    sheet.castShadow = true;
    G.add(sheet);
  }

  // Corner posts / sheet guides
  const guidePositions: [number, number][] = [[-2.4, -1.4], [2.4, -1.4], [-2.4, 1.4], [2.4, 1.4]];
  guidePositions.forEach(([gx, gz]) => {
    const guide = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8),
      MATS.brass
    );
    guide.position.set(ox + gx, 1.18, gz);
    guide.castShadow = true;
    G.add(guide);
    // cap
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      MATS.brass
    );
    cap.position.set(ox + gx, 1.43, gz);
    G.add(cap);
  });

  // Label plate
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 256;
  labelCanvas.height = 64;
  const lCtx = labelCanvas.getContext("2d")!;
  lCtx.fillStyle = "#2a6fba";
  lCtx.fillRect(0, 0, 256, 64);
  lCtx.fillStyle = "#fff";
  lCtx.font = "bold 22px Arial";
  lCtx.fillText("SHEET STOCK", 30, 40);
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  const labelMat = new THREE.MeshStandardMaterial({ map: labelTex, metalness: 0.4, roughness: 0.5 });
  const label = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.02), labelMat);
  label.position.set(ox, 0.55, 2.01);
  G.add(label);

  scene.add(G);
  return G;
}
