import * as THREE from "three";

export interface FactoryMaterials {
  steel: THREE.MeshStandardMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  castIron: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  copper: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  yellowPaint: THREE.MeshStandardMaterial;
  safetyYellow: THREE.MeshStandardMaterial;
  redPaint: THREE.MeshStandardMaterial;
  greenPaint: THREE.MeshStandardMaterial;
  orangePaint: THREE.MeshStandardMaterial;
  bluePaint: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  hydraulicRed: THREE.MeshStandardMaterial;
  hydraulicChrome: THREE.MeshStandardMaterial;
}

let _mats: FactoryMaterials | null = null;

export function getFactoryMaterials(): FactoryMaterials {
  if (_mats) return _mats;

  _mats = {
    steel: new THREE.MeshStandardMaterial({ color: 0x8a9bae, metalness: 0.95, roughness: 0.15 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x3d4f5f, metalness: 0.9, roughness: 0.2 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xd0d8e0, metalness: 1.0, roughness: 0.05 }),
    castIron: new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.7, roughness: 0.55 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.0, roughness: 0.9 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.85, roughness: 0.25 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a84c, metalness: 0.85, roughness: 0.3 }),
    yellowPaint: new THREE.MeshStandardMaterial({ color: 0xf0c030, metalness: 0.3, roughness: 0.5 }),
    safetyYellow: new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.2, roughness: 0.6 }),
    redPaint: new THREE.MeshStandardMaterial({ color: 0xb8292f, metalness: 0.3, roughness: 0.5 }),
    greenPaint: new THREE.MeshStandardMaterial({ color: 0x1f7a3f, metalness: 0.3, roughness: 0.5 }),
    orangePaint: new THREE.MeshStandardMaterial({ color: 0xd4652a, metalness: 0.3, roughness: 0.5 }),
    bluePaint: new THREE.MeshStandardMaterial({ color: 0x2a6fba, metalness: 0.35, roughness: 0.45 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x7a7a78, metalness: 0.05, roughness: 0.95 }),
    hydraulicRed: new THREE.MeshStandardMaterial({ color: 0xcc3333, metalness: 0.6, roughness: 0.3 }),
    hydraulicChrome: new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 1.0, roughness: 0.08 }),
  };

  return _mats;
}

export function disposeFactoryMaterials(): void {
  if (_mats) {
    Object.values(_mats).forEach((m) => m.dispose());
    _mats = null;
  }
}
