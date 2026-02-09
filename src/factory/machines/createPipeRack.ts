import * as THREE from "three";
import { getFactoryMaterials } from "../materials";

export interface PipeRackResult {
  group: THREE.Group;
  cradlePositions: THREE.Vector3[]; // world positions of each cradle slot
}

export function createPipeRack(scene: THREE.Scene): PipeRackResult {
  const MATS = getFactoryMaterials();
  const G = new THREE.Group();
  const ox = 18;

  const cradlePositions: THREE.Vector3[] = [];
  const slotCount = 5;
  const slotSpacing = 0.6;
  const baseY = 0.7;

  // ─── Frame: Two A-frame uprights ───
  for (const side of [-1, 1]) {
    const sz = side * 1.8;

    // Vertical uprights
    for (const ux of [-1.2, 1.2]) {
      const upright = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 3.8, 0.12),
        MATS.darkSteel
      );
      upright.position.set(ox + ux, 1.9, sz);
      upright.castShadow = true;
      G.add(upright);
    }

    // Diagonal braces
    const brace = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.06, 0.06),
      MATS.darkSteel
    );
    brace.position.set(ox, 1.9, sz);
    brace.rotation.z = 0.15 * side;
    G.add(brace);
  }

  // ─── Cross beams connecting the two sides ───
  for (let i = 0; i < 4; i++) {
    const beamY = 0.5 + i * 1.0;
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 3.4),
      MATS.darkSteel
    );
    beam.position.set(ox - 1.2, beamY, 0);
    G.add(beam);

    const beam2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 3.4),
      MATS.darkSteel
    );
    beam2.position.set(ox + 1.2, beamY, 0);
    G.add(beam2);
  }

  // ─── V-shaped cradles for holding pipes ───
  for (let i = 0; i < slotCount; i++) {
    const cy = baseY + i * slotSpacing;

    for (const side of [-1, 1]) {
      // V-cradle arms (angled bars)
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.06, 0.08),
        MATS.steel
      );
      arm.position.set(ox, cy, side * 0.3);
      arm.rotation.z = side * 0.35;
      arm.castShadow = true;
      G.add(arm);
    }

    // Small cradle stops at ends
    for (const ex of [-1.1, 1.1]) {
      const stop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8),
        MATS.brass
      );
      stop.position.set(ox + ex, cy + 0.15, 0);
      G.add(stop);
    }

    cradlePositions.push(new THREE.Vector3(ox, cy + 0.2, 0));
  }

  // ─── Base feet ───
  for (const fx of [-1.2, 1.2]) {
    for (const fz of [-1.8, 1.8]) {
      const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.18, 0.04, 12),
        MATS.rubber
      );
      foot.position.set(ox + fx, 0.02, fz);
      G.add(foot);
    }
  }

  // ─── Label plate ───
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 256;
  labelCanvas.height = 64;
  const lCtx = labelCanvas.getContext("2d")!;
  lCtx.fillStyle = "#2a6fba";
  lCtx.fillRect(0, 0, 256, 64);
  lCtx.fillStyle = "#fff";
  lCtx.font = "bold 20px Arial";
  lCtx.fillText("PIPE STORAGE", 25, 40);
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  const labelMat = new THREE.MeshStandardMaterial({ map: labelTex, metalness: 0.4, roughness: 0.5 });
  const label = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.02), labelMat);
  label.position.set(ox, 0.4, 1.85);
  G.add(label);

  scene.add(G);
  return { group: G, cradlePositions };
}
