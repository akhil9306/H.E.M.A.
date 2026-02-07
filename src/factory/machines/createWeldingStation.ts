import * as THREE from "three";
import { getFactoryMaterials } from "../materials";
import { addBoltRing } from "../helpers";
import type { FactoryAnimParts } from "../types";

export function createWeldingStation(
  scene: THREE.Scene,
  animParts: FactoryAnimParts
): THREE.Group {
  const MATS = getFactoryMaterials();
  const G = new THREE.Group();
  const ox = 12;

  // Heavy welding table with T-slots
  const tableLegs: [number, number][] = [[-1.5, -1.0], [1.5, -1.0], [-1.5, 1.0], [1.5, 1.0]];
  tableLegs.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.7, 0.15),
      MATS.darkSteel
    );
    leg.position.set(ox + lx, 0.35, lz);
    leg.castShadow = true;
    G.add(leg);
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.04, 0.25),
      MATS.rubber
    );
    foot.position.set(ox + lx, 0.02, lz);
    G.add(foot);
  });

  // Cross braces
  for (let side = -1; side <= 1; side += 2) {
    const brace = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.06, 0.06),
      MATS.darkSteel
    );
    brace.position.set(ox, 0.25, side * 1.0);
    G.add(brace);
  }

  // Thick steel table top
  const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.2, 2.8),
    MATS.castIron
  );
  tableTop.position.set(ox, 0.8, 0);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  G.add(tableTop);

  // Table surface with T-slot pattern
  for (let i = -3; i <= 3; i++) {
    const slot = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.005, 2.4),
      MATS.darkSteel
    );
    slot.position.set(ox + i * 0.4, 0.91, 0);
    G.add(slot);
  }

  // Orange painted side panels
  const sidePanel1 = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.4, 0.06),
    MATS.orangePaint
  );
  sidePanel1.position.set(ox, 0.5, 1.4);
  G.add(sidePanel1);
  const sidePanel2 = sidePanel1.clone();
  sidePanel2.position.z = -1.4;
  G.add(sidePanel2);

  // Pipe fixture clamps (V-block style)
  for (let ci = 0; ci < 2; ci++) {
    const clampX = ox + (ci * 2 - 1) * 0.8;

    // V-block base
    const vBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.25, 0.4),
      MATS.steel
    );
    vBlock.position.set(clampX, 1.03, 0);
    vBlock.castShadow = true;
    G.add(vBlock);

    // V groove (two angled plates)
    for (let vs = -1; vs <= 1; vs += 2) {
      const vPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.15, 0.04),
        MATS.chrome
      );
      vPlate.position.set(clampX, 1.2, vs * 0.1);
      vPlate.rotation.x = vs * 0.5;
      G.add(vPlate);
    }

    // Toggle clamp on top
    const clampBase2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.08, 0.15),
      MATS.castIron
    );
    clampBase2.position.set(clampX, 1.2, 0.3);
    G.add(clampBase2);

    const clampArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.35, 0.06),
      MATS.darkSteel
    );
    clampArm.position.set(clampX, 1.4, 0.3);
    clampArm.rotation.z = -0.4;
    G.add(clampArm);

    const clampHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8),
      MATS.rubber
    );
    clampHandle.rotation.z = Math.PI / 2;
    clampHandle.position.set(clampX, 1.55, 0.3);
    G.add(clampHandle);
  }

  // Welding gantry (overhead bridge)
  for (let side = -1; side <= 1; side += 2) {
    // Gantry columns
    const gCol = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 2.5, 0.2),
      MATS.orangePaint
    );
    gCol.position.set(ox, 2.15, side * 1.8);
    gCol.castShadow = true;
    G.add(gCol);

    // Column base plates
    const basePlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.05, 0.4),
      MATS.darkSteel
    );
    basePlate.position.set(ox, 0.92, side * 1.8);
    G.add(basePlate);
    addBoltRing(G, ox, 0.95, side * 1.8, 0.14, 4, 0.015);
  }

  // Gantry cross beam
  const crossBeam = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.25, 3.8),
    MATS.orangePaint
  );
  crossBeam.position.set(ox, 3.4, 0);
  crossBeam.castShadow = true;
  G.add(crossBeam);

  // Linear rail on cross beam
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.06, 3.2),
    MATS.chrome
  );
  rail.position.set(ox - 0.08, 3.22, 0);
  G.add(rail);

  // Welding torch carriage (slides on rail)
  const carriage = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.15, 0.25),
    MATS.darkSteel
  );
  carriage.position.set(ox - 0.08, 3.1, 0);
  G.add(carriage);

  // Torch arm (vertical, articulated)
  const torchArm1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.8, 12),
    MATS.steel
  );
  torchArm1.position.set(ox - 0.08, 2.65, 0);
  torchArm1.castShadow = true;
  G.add(torchArm1);
  animParts.torchRef = torchArm1;

  // Articulated joint
  const joint = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 12, 12),
    MATS.darkSteel
  );
  joint.position.set(ox - 0.08, 2.25, 0);
  G.add(joint);

  // Torch arm 2 (angled down)
  const torchArm2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.6, 12),
    MATS.steel
  );
  torchArm2.position.set(ox - 0.08, 1.95, 0);
  torchArm2.castShadow = true;
  G.add(torchArm2);

  // MIG/TIG torch head (detailed)
  const torchBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.025, 0.2, 12),
    MATS.copper
  );
  torchBody.position.set(ox - 0.08, 1.55, 0);
  torchBody.castShadow = true;
  G.add(torchBody);

  // Torch gas nozzle
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.02, 0.1, 12),
    MATS.copper
  );
  nozzle.position.set(ox - 0.08, 1.4, 0);
  G.add(nozzle);

  // Contact tip
  const tip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.005, 0.06, 8),
    MATS.copper
  );
  tip.position.set(ox - 0.08, 1.32, 0);
  G.add(tip);

  // Welding arc glow
  const arcGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0x44ccff,
      transparent: true,
      opacity: 0.8,
    })
  );
  arcGlow.position.set(ox - 0.08, 1.28, 0);
  G.add(arcGlow);
  animParts.glowRef = arcGlow;

  // Arc point light
  const arcLight = new THREE.PointLight(0x44ccff, 3, 6);
  arcLight.position.set(ox - 0.08, 1.28, 0);
  G.add(arcLight);
  animParts.arcLightRef = arcLight;

  // Spark particles (small spheres that will animate)
  for (let s = 0; s < 15; s++) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xffcc33 })
    );
    spark.position.set(ox - 0.08, 1.28, 0);
    spark.visible = true;
    spark.userData = {
      vx: (Math.random() - 0.5) * 0.04,
      vy: Math.random() * 0.06 + 0.02,
      vz: (Math.random() - 0.5) * 0.04,
      life: Math.random(),
      baseX: ox - 0.08,
      baseZ: 0,
    };
    G.add(spark);
    animParts.sparkParticles.push(spark);
  }

  // Wire spool holder
  const spoolBracket = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.3, 0.08),
    MATS.darkSteel
  );
  spoolBracket.position.set(ox + 0.3, 3.25, 0);
  G.add(spoolBracket);
  const spool = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16),
    MATS.steel
  );
  spool.rotation.x = Math.PI / 2;
  spool.position.set(ox + 0.3, 3.4, 0);
  G.add(spool);
  // Wire on spool
  const wire = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.02, 8, 24),
    MATS.copper
  );
  wire.position.set(ox + 0.3, 3.4, 0);
  wire.rotation.y = Math.PI / 2;
  G.add(wire);

  // Welding power source (large box, side)
  const powerSource = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 1.4, 0.7),
    MATS.orangePaint
  );
  powerSource.position.set(ox + 2.2, 1.0, -1.5);
  powerSource.castShadow = true;
  G.add(powerSource);

  // Power source details
  const psFront = new THREE.Mesh(
    new THREE.BoxGeometry(0.98, 1.38, 0.02),
    MATS.darkSteel
  );
  psFront.position.set(ox + 2.2, 1.0, -1.14);
  G.add(psFront);

  // Digital display on power source
  const psScreen = document.createElement("canvas");
  psScreen.width = 128;
  psScreen.height = 64;
  const psCtx = psScreen.getContext("2d")!;
  psCtx.fillStyle = "#001a00";
  psCtx.fillRect(0, 0, 128, 64);
  psCtx.fillStyle = "#00ff44";
  psCtx.font = "bold 24px monospace";
  psCtx.fillText("250A", 20, 40);
  const psTex = new THREE.CanvasTexture(psScreen);
  const psDisplay = new THREE.Mesh(
    new THREE.PlaneGeometry(0.25, 0.12),
    new THREE.MeshBasicMaterial({ map: psTex })
  );
  psDisplay.position.set(ox + 2.2, 1.35, -1.13);
  G.add(psDisplay);

  // Knobs on power source
  for (let k = 0; k < 3; k++) {
    const knob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12),
      MATS.rubber
    );
    knob.rotation.x = Math.PI / 2;
    knob.position.set(ox + 2.0 + k * 0.2, 1.1, -1.13);
    G.add(knob);
  }

  // Gas cylinder (argon/CO2)
  const gasCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 1.4, 16),
    new THREE.MeshStandardMaterial({ color: 0x2255aa, metalness: 0.7, roughness: 0.3 })
  );
  gasCylinder.position.set(ox + 2.5, 1.0, 1.2);
  gasCylinder.castShadow = true;
  G.add(gasCylinder);
  // Cylinder top dome
  const cylDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x2255aa, metalness: 0.7, roughness: 0.3 })
  );
  cylDome.position.set(ox + 2.5, 1.7, 1.2);
  G.add(cylDome);
  // Valve assembly
  const valve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8),
    MATS.brass
  );
  valve.position.set(ox + 2.5, 1.8, 1.2);
  G.add(valve);
  // Regulator
  const regulator = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, 0.06),
    MATS.brass
  );
  regulator.position.set(ox + 2.5, 1.78, 1.32);
  G.add(regulator);
  // Gas cylinder chain holder
  const chain = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.01, 4, 12, Math.PI),
    MATS.darkSteel
  );
  chain.position.set(ox + 2.5, 1.2, 1.2);
  chain.rotation.y = Math.PI / 2;
  G.add(chain);

  // Welding cable (thick, from power source to torch)
  const cablePoints: THREE.Vector3[] = [];
  for (let c = 0; c < 8; c++) {
    const t = c / 7;
    cablePoints.push(
      new THREE.Vector3(
        ox + 2.2 - t * 2.3,
        1.5 + Math.sin(t * Math.PI) * 1.0,
        -1.2 + t * 1.2
      )
    );
  }
  const cableCurve = new THREE.CatmullRomCurve3(cablePoints);
  const cableGeo = new THREE.TubeGeometry(cableCurve, 20, 0.025, 8, false);
  const cable = new THREE.Mesh(cableGeo, MATS.rubber);
  cable.castShadow = true;
  G.add(cable);

  // Ground clamp (on table edge)
  const groundClamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.06, 0.15),
    MATS.copper
  );
  groundClamp.position.set(ox + 1.7, 0.93, 0.8);
  G.add(groundClamp);
  // Ground cable
  const gCablePoints: THREE.Vector3[] = [];
  for (let c = 0; c < 5; c++) {
    const t = c / 4;
    gCablePoints.push(
      new THREE.Vector3(
        ox + 1.7 + t * 0.5,
        0.93 - t * 0.3,
        0.8 - t * 2.0
      )
    );
  }
  const gCableCurve = new THREE.CatmullRomCurve3(gCablePoints);
  const gCableGeo = new THREE.TubeGeometry(gCableCurve, 12, 0.015, 6, false);
  const gCable = new THREE.Mesh(gCableGeo, MATS.rubber);
  G.add(gCable);

  // Label
  const lCanvas = document.createElement("canvas");
  lCanvas.width = 256;
  lCanvas.height = 64;
  const lc = lCanvas.getContext("2d")!;
  lc.fillStyle = "#d4652a";
  lc.fillRect(0, 0, 256, 64);
  lc.fillStyle = "#fff";
  lc.font = "bold 18px Arial";
  lc.fillText("WELDING STATION", 20, 40);
  const lTex = new THREE.CanvasTexture(lCanvas);
  const lMat = new THREE.MeshStandardMaterial({ map: lTex, metalness: 0.4, roughness: 0.5 });
  const lMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.02), lMat);
  lMesh.position.set(ox, 0.5, 1.41);
  G.add(lMesh);

  scene.add(G);
  return G;
}
