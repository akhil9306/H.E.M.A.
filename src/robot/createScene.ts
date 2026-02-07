import * as THREE from "three";
import { COLORS } from "./types";

export interface SceneSetup {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  visionRenderer: THREE.WebGLRenderer;
  tableObjects: THREE.Mesh[];
}

export function createScene(
  container: HTMLDivElement,
  visionCanvas: HTMLCanvasElement
): SceneSetup {
  const scene = new THREE.Scene();
  // Temporarily use a visible test color (dark blue instead of black)
  scene.background = new THREE.Color(0x0a1a2e);
  scene.fog = new THREE.Fog(0x0a0a0a, 10, 50);

  // Use fallback dimensions if container not yet sized
  const width = container.clientWidth || 1280;
  const height = container.clientHeight || 720;

  const camera = new THREE.PerspectiveCamera(
    60,
    width / height,
    0.1,
    1000
  );
  camera.position.set(-4, 3, 6);
  camera.lookAt(0, 2, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
  });

  // IMPORTANT: Set buffer size AND CSS size correctly
  renderer.setSize(width, height, true); // updateStyle=true updates CSS too
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Ensure canvas is block-level and positioned correctly
  renderer.domElement.style.display = "block";
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.top = "0";
  renderer.domElement.style.left = "0";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";

  container.appendChild(renderer.domElement);

  console.log("Main renderer initialized:", width, "x", height);
  console.log("  - Canvas buffer size:", renderer.domElement.width, "x", renderer.domElement.height);
  console.log("  - Container size:", container.clientWidth, "x", container.clientHeight);
  console.log("  - Canvas appended to container");

  const visionRenderer = new THREE.WebGLRenderer({
    canvas: visionCanvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  visionRenderer.setSize(320, 240);
  visionRenderer.shadowMap.enabled = true;
  visionRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  visionRenderer.setClearColor(0x0a0a0a, 1);

  // Lights
  scene.add(new THREE.AmbientLight(0x404040, 0.6));

  const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
  mainLight.position.set(10, 15, 10);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  scene.add(mainLight);

  const backLight = new THREE.DirectionalLight(0x0088ff, 0.3);
  backLight.position.set(-5, 10, -5);
  scene.add(backLight);

  const fillLight = new THREE.DirectionalLight(0x4488ff, 0.4);
  fillLight.position.set(-5, 5, -5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x00d9ff, 0.6);
  rimLight.position.set(0, 3, -8);
  scene.add(rimLight);

  // Table area lights
  const tl1 = new THREE.PointLight(0xffffff, 1.0);
  tl1.position.set(0, 3, 1.8);
  scene.add(tl1);

  const tl2 = new THREE.PointLight(0xffffff, 0.8);
  tl2.position.set(0.5, 2.5, 2.2);
  scene.add(tl2);

  const tl3 = new THREE.PointLight(0xffffff, 0.8);
  tl3.position.set(-0.5, 2.5, 2.2);
  scene.add(tl3);

  // Debug: Add bright light at camera position
  const debugLight = new THREE.PointLight(0xffffff, 2.0, 50);
  debugLight.position.set(-4, 3, 6);
  scene.add(debugLight);
  console.log("Debug light added at camera position (-4, 3, 6)");

  // Grid
  const grid = new THREE.GridHelper(50, 50, 0x00d9ff, 0x1a1a2e);
  (grid.material as THREE.Material).opacity = 0.2;
  (grid.material as THREE.Material).transparent = true;
  scene.add(grid);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.8,
      metalness: 0.2,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const tableObjects = createTableWithObjects(scene);

  return { scene, camera, renderer, visionRenderer, tableObjects };
}

function createTableWithObjects(scene: THREE.Scene): THREE.Mesh[] {
  const tableX = 0;
  const tableZ = 1.8;
  const tableHeight = 2.2;
  const objects: THREE.Mesh[] = [];

  // Table top
  const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.12, 1.5),
    new THREE.MeshLambertMaterial({ color: COLORS.table })
  );
  tableTop.position.set(tableX, tableHeight, tableZ);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  scene.add(tableTop);

  // Table legs
  const legGeo = new THREE.CylinderGeometry(0.06, 0.06, tableHeight, 8);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x654321 });
  const legPos = [
    [tableX - 1.0, tableHeight / 2, tableZ - 0.65],
    [tableX - 1.0, tableHeight / 2, tableZ + 0.65],
    [tableX + 1.0, tableHeight / 2, tableZ - 0.65],
    [tableX + 1.0, tableHeight / 2, tableZ + 0.65],
  ];
  for (const pos of legPos) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(pos[0], pos[1], pos[2]);
    leg.castShadow = true;
    scene.add(leg);
  }

  const oh = tableHeight + 0.12;

  // Cube (Red)
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.25, 0.25),
    new THREE.MeshLambertMaterial({ color: 0xff0000, emissive: 0x330000, emissiveIntensity: 0.2 })
  );
  cube.position.set(tableX - 0.6, oh + 0.125, tableZ - 0.3);
  cube.castShadow = true;
  scene.add(cube);
  objects.push(cube);

  // Sphere (Blue)
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 20, 20),
    new THREE.MeshLambertMaterial({ color: 0x0000ff, emissive: 0x000033, emissiveIntensity: 0.2 })
  );
  sphere.position.set(tableX - 0.3, oh + 0.15, tableZ - 0.15);
  sphere.castShadow = true;
  scene.add(sphere);
  objects.push(sphere);

  // Cylinder (Green)
  const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.35, 20),
    new THREE.MeshLambertMaterial({ color: 0x00ff00, emissive: 0x003300, emissiveIntensity: 0.2 })
  );
  cylinder.position.set(tableX, oh + 0.175, tableZ);
  cylinder.castShadow = true;
  scene.add(cylinder);
  objects.push(cylinder);

  // Cuboid (Yellow)
  const cuboid = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.18, 0.22),
    new THREE.MeshLambertMaterial({ color: 0xffff00, emissive: 0x333300, emissiveIntensity: 0.2 })
  );
  cuboid.position.set(tableX + 0.35, oh + 0.09, tableZ + 0.2);
  cuboid.castShadow = true;
  scene.add(cuboid);
  objects.push(cuboid);

  // Cone (Magenta)
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.35, 20),
    new THREE.MeshLambertMaterial({ color: 0xff00ff, emissive: 0x330033, emissiveIntensity: 0.2 })
  );
  cone.position.set(tableX + 0.65, oh + 0.175, tableZ - 0.25);
  cone.castShadow = true;
  scene.add(cone);
  objects.push(cone);

  // Torus (Cyan)
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.04, 16, 32),
    new THREE.MeshLambertMaterial({ color: 0x00ffff, emissive: 0x003333, emissiveIntensity: 0.2 })
  );
  torus.position.set(tableX - 0.15, oh + 0.1, tableZ + 0.45);
  torus.rotation.x = Math.PI / 2;
  torus.castShadow = true;
  scene.add(torus);
  objects.push(torus);

  // Octahedron (Orange)
  const octa = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.15, 0),
    new THREE.MeshLambertMaterial({ color: 0xff8800, emissive: 0x332200, emissiveIntensity: 0.3 })
  );
  octa.position.set(tableX + 0.7, oh + 0.15, tableZ + 0.4);
  octa.castShadow = true;
  scene.add(octa);
  objects.push(octa);

  return objects;
}

export function setupMouseControls(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera
) {
  let isDragging = false;
  let prevMouse = { x: 0, y: 0 };
  let camDist = 8;

  const el = renderer.domElement;

  el.addEventListener("mousedown", () => {
    isDragging = true;
  });

  el.addEventListener("mousemove", (e) => {
    if (isDragging) {
      const dx = e.offsetX - prevMouse.x;
      const dy = e.offsetY - prevMouse.y;
      const angle = Math.atan2(camera.position.x, camera.position.z);
      const newAngle = angle + dx * 0.01;
      camera.position.x = Math.sin(newAngle) * camDist;
      camera.position.z = Math.cos(newAngle) * camDist;
      camera.position.y = Math.max(1, camera.position.y - dy * 0.01);
      camera.lookAt(0, 2, 0);
    }
    prevMouse = { x: e.offsetX, y: e.offsetY };
  });

  el.addEventListener("mouseup", () => {
    isDragging = false;
  });

  el.addEventListener("wheel", (e) => {
    e.preventDefault();
    camDist += e.deltaY * 0.01;
    camDist = Math.max(3, Math.min(20, camDist));
    const angle = Math.atan2(camera.position.x, camera.position.z);
    camera.position.x = Math.sin(angle) * camDist;
    camera.position.z = Math.cos(angle) * camDist;
    camera.lookAt(0, 2, 0);
  });
}
