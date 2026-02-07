import * as THREE from "three";
import { getFactoryMaterials } from "./materials";

export function addBoltRing(
  group: THREE.Group,
  cx: number, cy: number, cz: number,
  radius: number, count: number, boltR = 0.025
): void {
  const MATS = getFactoryMaterials();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const bx = cx + Math.cos(a) * radius;
    const bz = cz + Math.sin(a) * radius;
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(boltR, boltR, 0.04, 6),
      MATS.darkSteel
    );
    bolt.position.set(bx, cy, bz);
    bolt.castShadow = true;
    group.add(bolt);
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(boltR * 1.6, boltR * 1.6, 0.02, 6),
      MATS.darkSteel
    );
    head.position.set(bx, cy + 0.025, bz);
    group.add(head);
  }
}

export function createHydraulicCylinder(
  group: THREE.Group,
  x: number, y: number, z: number,
  length: number, radius = 0.09, angle?: number
): void {
  const MATS = getFactoryMaterials();
  const cylGroup = new THREE.Group();

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length * 0.6, 16),
    MATS.hydraulicRed
  );
  barrel.position.y = length * 0.2;
  barrel.castShadow = true;
  cylGroup.add(barrel);

  const capGeo = new THREE.CylinderGeometry(radius * 1.15, radius * 1.15, 0.04, 16);
  const cap1 = new THREE.Mesh(capGeo, MATS.darkSteel);
  cap1.position.y = length * 0.5;
  cylGroup.add(cap1);
  const cap2 = cap1.clone();
  cap2.position.y = -length * 0.1;
  cylGroup.add(cap2);

  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.35, radius * 0.35, length * 0.55, 12),
    MATS.hydraulicChrome
  );
  rod.position.y = -length * 0.18;
  rod.castShadow = true;
  cylGroup.add(rod);

  const eye = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.5, radius * 0.2, 8, 12),
    MATS.darkSteel
  );
  eye.position.y = -length * 0.47;
  eye.rotation.x = Math.PI / 2;
  cylGroup.add(eye);

  cylGroup.position.set(x, y, z);
  if (angle) cylGroup.rotation.z = angle;
  group.add(cylGroup);
}

export function createIBeam(
  group: THREE.Group,
  x: number, y: number, z: number,
  height: number, width: number, depth: number
): void {
  const MATS = getFactoryMaterials();
  const flangeH = height * 0.12;
  const webW = width * 0.2;

  const tf = new THREE.Mesh(new THREE.BoxGeometry(width, flangeH, depth), MATS.darkSteel);
  tf.position.set(x, y + height / 2 - flangeH / 2, z);
  tf.castShadow = true;
  group.add(tf);

  const bf = tf.clone();
  bf.position.y = y - height / 2 + flangeH / 2;
  group.add(bf);

  const web = new THREE.Mesh(new THREE.BoxGeometry(webW, height - flangeH * 2, depth), MATS.darkSteel);
  web.position.set(x, y, z);
  web.castShadow = true;
  group.add(web);
}

export function addWarningStripes(
  group: THREE.Group,
  x: number, y: number, z: number,
  w: number, h: number, d: number
): void {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = "#222";
  for (let i = -4; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 20, 0);
    ctx.lineTo(i * 20 + 32, 0);
    ctx.lineTo(i * 20 + 12, 64);
    ctx.lineTo(i * 20 - 8, 64);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const mat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.2, roughness: 0.6 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  group.add(mesh);
}

export function createCanvasLabel(
  text: string, bgColor: string, textColor: string,
  width = 256, height = 64, font = "bold 20px Arial"
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = textColor;
  ctx.font = font;
  ctx.fillText(text, 20, height * 0.65);
  return new THREE.CanvasTexture(canvas);
}
