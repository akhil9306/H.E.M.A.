import * as THREE from "three";
import { getFactoryMaterials } from "../materials";

export function createConveyors(scene: THREE.Scene): void {
  const MATS = getFactoryMaterials();
  const conveyorMat = MATS.darkSteel;
  const rollerMat = MATS.chrome;

  const positions = [
    { x1: -9, x2: -7.5, z: 0, y: 0.5 },
    { x1: -4.5, x2: -2.0, z: 0, y: 0.5 },
    { x1: 2.0, x2: 4.5, z: 0, y: 0.5 },
    { x1: 7.5, x2: 10.0, z: 0, y: 0.5 },
  ];

  positions.forEach((p) => {
    const len = p.x2 - p.x1;
    const cx = (p.x1 + p.x2) / 2;

    // side rails
    for (let side = -1; side <= 1; side += 2) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(len, 0.06, 0.06),
        conveyorMat
      );
      rail.position.set(cx, p.y + 0.15, p.z + side * 0.4);
      rail.castShadow = true;
      scene.add(rail);
    }

    // rollers
    const rollerCount = Math.floor(len / 0.2);
    for (let i = 0; i < rollerCount; i++) {
      const rx = p.x1 + (i + 0.5) * (len / rollerCount);
      const roller = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8),
        rollerMat
      );
      roller.rotation.x = Math.PI / 2;
      roller.position.set(rx, p.y + 0.12, p.z);
      scene.add(roller);
    }

    // legs
    for (let lx = 0; lx < 2; lx++) {
      for (let lz = -1; lz <= 1; lz += 2) {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, p.y + 0.1, 0.05),
          conveyorMat
        );
        leg.position.set(p.x1 + lx * len, (p.y + 0.1) / 2, p.z + lz * 0.4);
        scene.add(leg);
      }
    }
  });
}
