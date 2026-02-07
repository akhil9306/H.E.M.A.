import * as THREE from "three";
import { COLORS, type RobotParts } from "./types";

export function createRobot(scene: THREE.Scene): {
  robot: THREE.Group;
  parts: RobotParts;
} {
  const parts: Partial<RobotParts> = {
    leftFingers: [],
    rightFingers: [],
  };

  const robot = new THREE.Group();
  robot.position.set(0, 0, 0);
  robot.rotation.y = 0;

  const armorMat = new THREE.MeshStandardMaterial({
    color: COLORS.torso,
    roughness: 0.3,
    metalness: 0.6,
  });
  const innerMat = new THREE.MeshStandardMaterial({
    color: COLORS.torsoInner,
    roughness: 0.7,
    metalness: 0.4,
  });

  // Torso
  parts.torso = new THREE.Group();
  parts.torso.position.y = 2.3;
  robot.add(parts.torso);

  // Chest
  const chestGeo = new THREE.CylinderGeometry(0.36, 0.32, 0.45, 32);
  chestGeo.rotateZ(Math.PI / 2);
  const chest = new THREE.Mesh(chestGeo, armorMat);
  chest.position.y = 0.35;
  chest.scale.set(1, 1, 0.6);
  chest.castShadow = true;
  parts.torso.add(chest);

  // Pectorals
  const pecGeo = new THREE.BoxGeometry(0.25, 0.25, 0.05);
  const lPec = new THREE.Mesh(pecGeo, armorMat);
  lPec.position.set(-0.18, 0.4, 0.18);
  lPec.rotation.y = 0.2;
  lPec.castShadow = true;
  parts.torso.add(lPec);

  const rPec = new THREE.Mesh(pecGeo, armorMat);
  rPec.position.set(0.18, 0.4, 0.18);
  rPec.rotation.y = -0.2;
  rPec.castShadow = true;
  parts.torso.add(rPec);

  // Core (arc reactor)
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 0.6,
  });
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.05, 16),
    coreMat
  );
  core.rotation.x = Math.PI / 2;
  core.position.set(0, 0.4, 0.2);
  parts.torso.add(core);

  // Spine
  const spine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 0.5, 24),
    innerMat
  );
  spine.position.y = -0.1;
  spine.castShadow = true;
  parts.torso.add(spine);

  // Abdominal plating
  for (let i = 0; i < 3; i++) {
    const plateGeo = new THREE.CylinderGeometry(
      0.26 - i * 0.02,
      0.28 - i * 0.02,
      0.1,
      24
    );
    plateGeo.rotateZ(Math.PI / 2);
    const plate = new THREE.Mesh(plateGeo, armorMat);
    plate.position.y = 0.1 - i * 0.12;
    plate.scale.set(1, 1, 0.7);
    plate.castShadow = true;
    parts.torso.add(plate);
  }

  // Pelvis
  const hipGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.45, 24);
  hipGeo.rotateZ(Math.PI / 2);
  const hips = new THREE.Mesh(hipGeo, innerMat);
  hips.position.y = -0.45;
  parts.torso.add(hips);

  const pelvisGeo = new THREE.CylinderGeometry(0.36, 0.25, 0.35, 32);
  pelvisGeo.rotateZ(Math.PI / 2);
  const pelvis = new THREE.Mesh(pelvisGeo, armorMat);
  pelvis.position.y = -0.45;
  pelvis.scale.set(1, 1, 0.65);
  pelvis.castShadow = true;
  parts.torso.add(pelvis);

  // Neck joint
  createJointSphere(parts.torso, 0, 0.65, 0, 0.12);

  // Neck
  parts.neck = new THREE.Group();
  parts.neck.position.set(0, 0.65, 0);
  parts.torso.add(parts.neck);

  const neckCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 0.2, 24),
    innerMat
  );
  neckCyl.position.y = 0.1;
  parts.neck.add(neckCyl);

  // Head
  parts.head = new THREE.Group();
  parts.head.position.set(0, 0.2, 0);
  parts.neck.add(parts.head);

  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 64, 64),
    new THREE.MeshStandardMaterial({
      color: COLORS.head,
      roughness: 0.4,
      metalness: 0.3,
    })
  );
  headMesh.scale.set(0.85, 1.1, 0.95);
  headMesh.position.y = 0.2;
  headMesh.castShadow = true;
  parts.head.add(headMesh);

  // Vision System (Cyclops Eye)
  createVisionSystem(parts as RobotParts);

  // Arms
  createArm(parts as RobotParts, "left", -0.62, 0.45, 0, armorMat, innerMat);
  createArm(parts as RobotParts, "right", 0.62, 0.45, 0, armorMat, innerMat);

  // Legs
  createLeg(parts as RobotParts, "left", -0.24, -0.75, 0);
  createLeg(parts as RobotParts, "right", 0.24, -0.75, 0);

  scene.add(robot);

  console.log("Robot created and added to scene:");
  console.log("  - Robot position:", robot.position);
  console.log("  - Robot children count:", robot.children.length);
  console.log("  - Torso position:", parts.torso?.position);
  console.log("  - Head position:", parts.head?.position);
  console.log("  - Scene children count:", scene.children.length);

  return { robot, parts: parts as RobotParts };
}

function createJointSphere(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  radius = 0.12
) {
  const joint = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 16, 16),
    new THREE.MeshStandardMaterial({
      color: COLORS.joint,
      emissive: COLORS.joint,
      emissiveIntensity: 0.2,
      roughness: 0.5,
      metalness: 0.6,
    })
  );
  joint.position.set(x, y, z);
  joint.castShadow = true;
  parent.add(joint);
  return joint;
}

function createVisionSystem(parts: RobotParts) {
  const socketGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.08, 32);
  socketGeo.rotateX(Math.PI / 2);
  const socketMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.7,
    metalness: 0.5,
  });

  const socket = new THREE.Mesh(socketGeo, socketMat);
  socket.position.set(0, 0.15, 0.28);
  socket.castShadow = true;
  parts.head.add(socket);

  // Main Eye Lens
  parts.mainEye = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0x002244,
      emissive: COLORS.eye,
      emissiveIntensity: 0.8,
      roughness: 0.0,
      metalness: 1.0,
    })
  );
  parts.mainEye.position.set(0, 0, 0.02);
  parts.mainEye.scale.set(1, 1, 0.6);
  socket.add(parts.mainEye);

  // Aperture ring
  const aperture = new THREE.Mesh(
    new THREE.TorusGeometry(0.04, 0.005, 16, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  aperture.position.z = 0.08;
  parts.mainEye.add(aperture);

  // Eye light
  const eyeLight = new THREE.PointLight(COLORS.eye, 0.8, 4);
  eyeLight.position.set(0, 0.15, 0.4);
  parts.head.add(eyeLight);

  // Vision Camera
  parts.visionCamera = new THREE.PerspectiveCamera(80, 320 / 240, 0.1, 30);
  parts.visionCamera.rotation.y = Math.PI;
  parts.visionCamera.position.z = 0.1;
  parts.mainEye.add(parts.visionCamera);
}

function createArm(
  parts: RobotParts,
  side: "left" | "right",
  x: number,
  y: number,
  z: number,
  armorMat: THREE.MeshStandardMaterial,
  innerMat: THREE.MeshStandardMaterial
) {
  const sideKey = side === "left" ? "left" : "right";

  // Clavicle bridge
  const bridgeLen = Math.abs(x) - 0.15;
  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(bridgeLen, 0.12, 0.15),
    armorMat
  );
  bridge.position.set(x / 2, y + 0.05, z);
  bridge.castShadow = true;
  parts.torso.add(bridge);

  // Piston
  const pistonGeo = new THREE.CylinderGeometry(0.04, 0.04, bridgeLen, 12);
  pistonGeo.rotateZ(Math.PI / 2);
  const piston = new THREE.Mesh(pistonGeo, innerMat);
  piston.position.set(x / 2, y - 0.06, z);
  parts.torso.add(piston);

  createJointSphere(parts.torso, x, y, z, 0.13);

  // Shoulder group
  const shoulderKey = `${sideKey}Shoulder` as keyof RobotParts;
  parts[shoulderKey] = new THREE.Group() as any;
  (parts[shoulderKey] as THREE.Group).position.set(x, y, z);
  parts.torso.add(parts[shoulderKey] as THREE.Group);

  // Deltoid
  const deltoid = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 24, 24),
    armorMat
  );
  deltoid.scale.set(1, 1.2, 1);
  deltoid.position.y = -0.05;
  deltoid.castShadow = true;
  (parts[shoulderKey] as THREE.Group).add(deltoid);

  // Upper arm
  const upperArmGrp = new THREE.Group();
  upperArmGrp.position.y = -0.3;
  (parts[shoulderKey] as THREE.Group).add(upperArmGrp);

  const upperArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.1, 0.45, 24),
    armorMat
  );
  upperArm.castShadow = true;
  upperArmGrp.add(upperArm);

  // Elbow joint
  createJointSphere(parts[shoulderKey] as THREE.Group, 0, -0.6, 0, 0.11);

  // Elbow group
  const elbowKey = `${sideKey}Elbow` as keyof RobotParts;
  parts[elbowKey] = new THREE.Group() as any;
  (parts[elbowKey] as THREE.Group).position.y = -0.6;
  (parts[shoulderKey] as THREE.Group).add(parts[elbowKey] as THREE.Group);

  // Forearm
  const forearmGrp = new THREE.Group();
  forearmGrp.position.y = -0.3;
  (parts[elbowKey] as THREE.Group).add(forearmGrp);

  const forearm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.08, 0.5, 24),
    armorMat
  );
  forearm.castShadow = true;
  forearmGrp.add(forearm);

  // Wrist joint
  createJointSphere(parts[elbowKey] as THREE.Group, 0, -0.58, 0, 0.08);

  // Hand group
  const handKey = `${sideKey}Hand` as keyof RobotParts;
  parts[handKey] = new THREE.Group() as any;
  (parts[handKey] as THREE.Group).position.y = -0.58;
  (parts[elbowKey] as THREE.Group).add(parts[handKey] as THREE.Group);

  const handMat = new THREE.MeshStandardMaterial({
    color: COLORS.hand,
    roughness: 0.6,
    metalness: 0.5,
  });

  // Palm
  const palm = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.14, 0.05),
    handMat
  );
  palm.position.y = -0.07;
  palm.castShadow = true;
  (parts[handKey] as THREE.Group).add(palm);

  // Thumb mount
  const thumbMountGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.06, 16);
  thumbMountGeo.rotateZ(Math.PI / 2);
  const thumbMount = new THREE.Mesh(thumbMountGeo, handMat);
  const thumbX = side === "left" ? -0.08 : 0.08;
  thumbMount.position.set(thumbX, -0.05, 0.02);
  thumbMount.rotation.y = side === "left" ? -0.5 : 0.5;
  (parts[handKey] as THREE.Group).add(thumbMount);

  createThumb(parts, side);
  createFingers(parts, side);
}

function createThumb(parts: RobotParts, side: "left" | "right") {
  const thumbMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.4,
    metalness: 0.7,
  });
  const thumbJointMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.6,
    metalness: 0.7,
  });

  const mult = side === "left" ? -1 : 1;
  const handKey = `${side}Hand` as keyof RobotParts;
  const fingersKey = `${side}Fingers` as keyof RobotParts;

  const thumbBase = new THREE.Group();
  thumbBase.position.set(mult * 0.08, -0.06, 0.02);
  thumbBase.rotation.z = mult * 0.6;
  thumbBase.rotation.y = mult * 0.2;
  (parts[handKey] as THREE.Group).add(thumbBase);

  const metacarpal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.04, 16),
    thumbMat
  );
  metacarpal.position.y = -0.02;
  metacarpal.castShadow = true;
  thumbBase.add(metacarpal);

  const thumbSegments: THREE.Group[] = [];
  const thumbLengths = [0.035, 0.03];
  const thumbWidth = 0.02;

  for (let i = 0; i < 2; i++) {
    const segment = new THREE.Group();
    segment.position.y = i === 0 ? -0.04 : -thumbLengths[0];

    const segLen = thumbLengths[i];
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(
        thumbWidth * 0.9,
        thumbWidth * 0.8,
        segLen,
        16
      ),
      thumbMat
    );
    seg.position.y = -segLen / 2;
    seg.castShadow = true;
    segment.add(seg);

    const joint = new THREE.Mesh(
      new THREE.SphereGeometry(thumbWidth * 0.95, 12, 12),
      thumbJointMat
    );
    joint.position.y = -segLen;
    segment.add(joint);

    if (i === 0) {
      thumbBase.add(segment);
    } else {
      thumbSegments[i - 1].add(segment);
    }
    thumbSegments.push(segment);
  }

  (parts[fingersKey] as THREE.Group[][])[0] = thumbSegments;
}

function createFingers(parts: RobotParts, side: "left" | "right") {
  const fingersKey = `${side}Fingers` as keyof RobotParts;
  const handKey = `${side}Hand` as keyof RobotParts;

  const fingerMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.35,
    metalness: 0.75,
  });
  const fingerJointMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.6,
    metalness: 0.7,
  });

  const offsets = [
    { x: -0.05, y: -0.14, z: 0, scale: 1.0 },
    { x: -0.017, y: -0.14, z: 0, scale: 1.1 },
    { x: 0.017, y: -0.14, z: 0, scale: 1.05 },
    { x: 0.05, y: -0.14, z: 0, scale: 0.9 },
  ];

  offsets.forEach((offset, fi) => {
    const finger = new THREE.Group();
    finger.position.set(offset.x, offset.y, offset.z);
    (parts[handKey] as THREE.Group).add(finger);

    const knuckle = new THREE.Mesh(
      new THREE.SphereGeometry(0.018 * offset.scale, 16, 16),
      fingerJointMat
    );
    knuckle.position.y = 0.01;
    finger.add(knuckle);

    const segments: THREE.Group[] = [];
    const segLens = [0.035, 0.03, 0.025];
    const baseW = 0.015 * offset.scale;

    for (let j = 0; j < 3; j++) {
      const seg = new THREE.Group();
      seg.position.y = j === 0 ? 0 : -segLens[j - 1];

      const segLen = segLens[j] * offset.scale;
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(baseW, baseW * 0.9, segLen, 16),
        fingerMat
      );
      mesh.position.y = -segLen / 2;
      mesh.castShadow = true;
      seg.add(mesh);

      if (j < 2) {
        const jnt = new THREE.Mesh(
          new THREE.SphereGeometry(baseW * 0.95, 12, 12),
          fingerJointMat
        );
        jnt.position.y = -segLen;
        jnt.castShadow = true;
        seg.add(jnt);
      } else {
        const tip = new THREE.Mesh(
          new THREE.SphereGeometry(baseW * 0.9, 16, 16),
          fingerMat
        );
        tip.position.y = -segLen;
        tip.castShadow = true;
        seg.add(tip);
      }

      if (j === 0) {
        finger.add(seg);
      } else {
        segments[j - 1].add(seg);
      }
      segments.push(seg);
    }

    (parts[fingersKey] as THREE.Group[][])[fi + 1] = segments;
  });
}

function createLeg(
  parts: RobotParts,
  side: "left" | "right",
  x: number,
  y: number,
  z: number
) {
  const armorMat = new THREE.MeshStandardMaterial({
    color: COLORS.limb,
    roughness: 0.3,
    metalness: 0.7,
  });
  const innerMat = new THREE.MeshStandardMaterial({
    color: COLORS.limbInner,
    roughness: 0.6,
    metalness: 0.5,
  });

  createJointSphere(parts.torso, x, y, z, 0.14);

  // Hip group
  const hipKey = `${side}Hip` as keyof RobotParts;
  parts[hipKey] = new THREE.Group() as any;
  (parts[hipKey] as THREE.Group).position.set(x, y, z);
  parts.torso.add(parts[hipKey] as THREE.Group);

  // Thigh
  const thighGrp = new THREE.Group();
  thighGrp.position.y = -0.4;
  (parts[hipKey] as THREE.Group).add(thighGrp);

  const thigh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.12, 0.65, 24),
    armorMat
  );
  thigh.castShadow = true;
  thighGrp.add(thigh);

  const thighPlateGeo = new THREE.CylinderGeometry(
    0.16,
    0.14,
    0.5,
    16,
    1,
    false,
    0,
    Math.PI
  );
  const thighPlate = new THREE.Mesh(thighPlateGeo, armorMat);
  thighPlate.position.set(0, 0, 0.02);
  thighPlate.scale.set(1, 1, 0.5);
  thighPlate.castShadow = true;
  thighGrp.add(thighPlate);

  // Knee joint
  createJointSphere(parts[hipKey] as THREE.Group, 0, -0.75, 0, 0.12);

  // Knee group
  const kneeKey = `${side}Knee` as keyof RobotParts;
  parts[kneeKey] = new THREE.Group() as any;
  (parts[kneeKey] as THREE.Group).position.y = -0.75;
  (parts[hipKey] as THREE.Group).add(parts[kneeKey] as THREE.Group);

  // Shin
  const shinGrp = new THREE.Group();
  shinGrp.position.y = -0.35;
  (parts[kneeKey] as THREE.Group).add(shinGrp);

  const shin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.09, 0.65, 24),
    armorMat
  );
  shin.castShadow = true;
  shinGrp.add(shin);

  const shinArmorGeo = new THREE.CylinderGeometry(
    0.13,
    0.1,
    0.5,
    16,
    1,
    false,
    0,
    Math.PI
  );
  const shinArmor = new THREE.Mesh(shinArmorGeo, armorMat);
  shinArmor.position.set(0, 0.05, 0.02);
  shinArmor.scale.set(1, 1, 0.5);
  shinArmor.castShadow = true;
  shinGrp.add(shinArmor);

  // Ankle
  createJointSphere(parts[kneeKey] as THREE.Group, 0, -0.68, 0, 0.1);

  // Foot
  const footMat = new THREE.MeshStandardMaterial({
    color: COLORS.foot,
    roughness: 0.5,
    metalness: 0.6,
  });
  const footGrp = new THREE.Group();
  footGrp.position.set(0, -0.75, 0.05);
  (parts[kneeKey] as THREE.Group).add(footGrp);

  const footMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.06, 0.32),
    footMat
  );
  footMesh.position.z = 0.05;
  footMesh.castShadow = true;
  footGrp.add(footMesh);

  const instepGeo = new THREE.CylinderGeometry(
    0.08,
    0.12,
    0.15,
    16,
    1,
    false,
    0,
    Math.PI
  );
  instepGeo.rotateZ(Math.PI / 2);
  instepGeo.rotateY(Math.PI / 2);
  const instep = new THREE.Mesh(instepGeo, armorMat);
  instep.position.set(0, 0.08, 0);
  footGrp.add(instep);
}
