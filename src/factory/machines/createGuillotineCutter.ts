import * as THREE from "three";
import { getFactoryMaterials } from "../materials";
import { addBoltRing, createHydraulicCylinder, addWarningStripes } from "../helpers";
import type { FactoryAnimParts } from "../types";

export function createGuillotineCutter(
  scene: THREE.Scene,
  animParts: FactoryAnimParts
): THREE.Group {
  const MATS = getFactoryMaterials();
  const G = new THREE.Group();
  const ox = -6;

  // Heavy cast-iron base
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.6, 2.5),
    MATS.castIron
  );
  base.position.set(ox, 0.3, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  G.add(base);

  // Red painted body panels
  const bodyFront = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.35, 0.08),
    MATS.redPaint
  );
  bodyFront.position.set(ox, 0.78, 1.2);
  bodyFront.castShadow = true;
  G.add(bodyFront);
  const bodyBack = bodyFront.clone();
  bodyBack.position.z = -1.2;
  G.add(bodyBack);

  // Warning stripe on base front
  addWarningStripes(G, ox, 0.6, 1.26, 3.4, 0.06, 0.02);

  // Precision cutting table (polished top)
  const table = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.12, 2.2),
    MATS.chrome
  );
  table.position.set(ox, 0.66, 0);
  table.castShadow = true;
  G.add(table);

  // Table measurement ruler etching
  const rulerCanvas = document.createElement("canvas");
  rulerCanvas.width = 512;
  rulerCanvas.height = 32;
  const rCtx = rulerCanvas.getContext("2d")!;
  rCtx.fillStyle = "#c0c8d0";
  rCtx.fillRect(0, 0, 512, 32);
  rCtx.strokeStyle = "#333";
  rCtx.lineWidth = 1;
  for (let i = 0; i < 512; i += 16) {
    const h = i % 64 === 0 ? 28 : i % 32 === 0 ? 18 : 10;
    rCtx.beginPath();
    rCtx.moveTo(i, 32);
    rCtx.lineTo(i, 32 - h);
    rCtx.stroke();
  }
  const rulerTex = new THREE.CanvasTexture(rulerCanvas);
  const rulerMat = new THREE.MeshStandardMaterial({ map: rulerTex, metalness: 0.8, roughness: 0.15 });
  const ruler = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.005, 0.1), rulerMat);
  ruler.position.set(ox, 0.73, 0.95);
  G.add(ruler);

  // Rear backstop (adjustable)
  const backstop = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.3, 0.08),
    MATS.steel
  );
  backstop.position.set(ox, 0.85, -0.9);
  backstop.castShadow = true;
  G.add(backstop);

  // Heavy-duty side frames (C-shape)
  for (let side = -1; side <= 1; side += 2) {
    const sideX = ox + side * 1.55;
    // vertical post
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 2.8, 0.35),
      MATS.castIron
    );
    post.position.set(sideX, 2.0, -0.6);
    post.castShadow = true;
    G.add(post);

    // reinforcement ribs on side frame
    for (let r = 0; r < 3; r++) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.6, 0.3),
        MATS.castIron
      );
      rib.position.set(sideX + side * 0.13, 1.2 + r * 0.7, -0.6);
      G.add(rib);
    }

    // Guide rail (where blade slides)
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 2.0, 0.06),
      MATS.chrome
    );
    rail.position.set(sideX - side * 0.05, 2.0, -0.4);
    G.add(rail);
  }

  // Top beam (heavy cross member)
  const topBeam = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.3, 0.45),
    MATS.castIron
  );
  topBeam.position.set(ox, 3.45, -0.6);
  topBeam.castShadow = true;
  G.add(topBeam);
  // Red paint on top beam
  const topPaint = new THREE.Mesh(
    new THREE.BoxGeometry(3.52, 0.1, 0.46),
    MATS.redPaint
  );
  topPaint.position.set(ox, 3.61, -0.6);
  G.add(topPaint);

  // Blade holder (the moving part)
  const bladeHolder = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.2, 0.3),
    MATS.darkSteel
  );
  bladeHolder.position.set(ox, 2.1, -0.4);
  bladeHolder.castShadow = true;
  G.add(bladeHolder);

  // Cutting blade - angled for shear cut
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-1.4, 0);
  bladeShape.lineTo(1.4, -0.12);
  bladeShape.lineTo(1.4, -0.04);
  bladeShape.lineTo(-1.4, 0.08);
  bladeShape.closePath();
  const bladeExtrudeSettings = { depth: 0.04, bevelEnabled: false };
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, bladeExtrudeSettings);
  const blade = new THREE.Mesh(bladeGeo, MATS.chrome);
  blade.position.set(ox, 1.95, -0.38);
  blade.castShadow = true;
  G.add(blade);
  animParts.bladeRef = blade;

  // Hydraulic cylinders (detailed, 2 units)
  createHydraulicCylinder(G, ox - 0.8, 2.9, -0.6, 1.2, 0.1);
  createHydraulicCylinder(G, ox + 0.8, 2.9, -0.6, 1.2, 0.1);

  // Sheet hold-down (spring loaded clamp bar)
  const holdDown = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.08, 0.15),
    MATS.steel
  );
  holdDown.position.set(ox, 1.0, -0.2);
  holdDown.castShadow = true;
  G.add(holdDown);
  // springs
  for (let i = 0; i < 4; i++) {
    const spring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8),
      MATS.brass
    );
    spring.position.set(ox - 1.1 + i * 0.73, 1.15, -0.2);
    G.add(spring);
  }

  // Control pendant (hanging control box)
  const pendantWire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 1.0, 6),
    MATS.rubber
  );
  pendantWire.position.set(ox + 1.2, 3.0, 0.5);
  G.add(pendantWire);
  const pendant = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.25, 0.08),
    MATS.safetyYellow
  );
  pendant.position.set(ox + 1.2, 2.45, 0.5);
  G.add(pendant);
  // buttons on pendant
  const btnColors = [0x22cc22, 0xcc2222, 0xeebb00];
  btnColors.forEach((c, i) => {
    const btn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.01, 8),
      new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.3 })
    );
    btn.rotation.x = Math.PI / 2;
    btn.position.set(ox + 1.2, 2.5 - i * 0.08, 0.54);
    G.add(btn);
  });

  // Bolts on the side frames
  addBoltRing(G, ox - 1.55, 3.45, -0.6, 0.08, 4, 0.02);
  addBoltRing(G, ox + 1.55, 3.45, -0.6, 0.08, 4, 0.02);

  // Label
  const lCanvas = document.createElement("canvas");
  lCanvas.width = 256;
  lCanvas.height = 64;
  const lc = lCanvas.getContext("2d")!;
  lc.fillStyle = "#b8292f";
  lc.fillRect(0, 0, 256, 64);
  lc.fillStyle = "#fff";
  lc.font = "bold 20px Arial";
  lc.fillText("GUILLOTINE", 40, 40);
  const lTex = new THREE.CanvasTexture(lCanvas);
  const lMat = new THREE.MeshStandardMaterial({ map: lTex, metalness: 0.4, roughness: 0.5 });
  const lMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 0.02), lMat);
  lMesh.position.set(ox, 0.45, 1.26);
  G.add(lMesh);

  scene.add(G);
  return G;
}
