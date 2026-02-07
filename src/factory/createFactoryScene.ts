import * as THREE from "three";

export interface FactorySceneResult {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: {
    dispose: () => void;
  };
}

export function createFactoryScene(container: HTMLDivElement): FactorySceneResult {
  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.FogExp2(0x1a1a2e, 0.018);

  // Camera
  const camera = new THREE.PerspectiveCamera(
    55,
    container.clientWidth / container.clientHeight,
    0.1,
    200
  );
  camera.position.set(18, 14, 18);
  camera.lookAt(0, 2, 0);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0x8899bb, 0x444422, 0.5);
  scene.add(hemiLight);

  const dirLight1 = new THREE.DirectionalLight(0xffeedd, 0.9);
  dirLight1.position.set(12, 25, 15);
  dirLight1.castShadow = true;
  dirLight1.shadow.mapSize.width = 4096;
  dirLight1.shadow.mapSize.height = 4096;
  dirLight1.shadow.camera.left = -25;
  dirLight1.shadow.camera.right = 25;
  dirLight1.shadow.camera.top = 25;
  dirLight1.shadow.camera.bottom = -25;
  dirLight1.shadow.camera.near = 1;
  dirLight1.shadow.camera.far = 60;
  dirLight1.shadow.bias = -0.001;
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x8899cc, 0.35);
  dirLight2.position.set(-15, 12, -8);
  scene.add(dirLight2);

  // Factory overhead spot lights
  for (let i = 0; i < 5; i++) {
    const spotLight = new THREE.PointLight(0xffeebb, 0.4, 15);
    spotLight.position.set(-12 + i * 6, 8, 0);
    scene.add(spotLight);
  }

  // Factory floor - textured concrete
  const floorCanvas = document.createElement("canvas");
  floorCanvas.width = 512;
  floorCanvas.height = 512;
  const fCtx = floorCanvas.getContext("2d")!;
  fCtx.fillStyle = "#3a4556";
  fCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8000; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    const bright = 40 + Math.random() * 30;
    fCtx.fillStyle = `rgba(${bright},${bright + 5},${bright + 10},0.3)`;
    fCtx.fillRect(rx, ry, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }
  fCtx.strokeStyle = "rgba(255,255,255,0.06)";
  fCtx.lineWidth = 1;
  for (let i = 0; i < 512; i += 64) {
    fCtx.beginPath(); fCtx.moveTo(i, 0); fCtx.lineTo(i, 512); fCtx.stroke();
    fCtx.beginPath(); fCtx.moveTo(0, i); fCtx.lineTo(512, i); fCtx.stroke();
  }
  const floorTex = new THREE.CanvasTexture(floorCanvas);
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(6, 6);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85, metalness: 0.1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Mouse controls - orbit
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  let cameraAngle = Math.atan2(camera.position.z, camera.position.x);
  let cameraHeight = camera.position.y;
  let cameraRadius = Math.sqrt(
    camera.position.x * camera.position.x + camera.position.z * camera.position.z
  );

  const onMouseDown = (e: MouseEvent) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      cameraAngle -= deltaX * 0.008;
      cameraHeight = Math.max(2, Math.min(30, cameraHeight - deltaY * 0.08));
      camera.position.x = Math.cos(cameraAngle) * cameraRadius;
      camera.position.z = Math.sin(cameraAngle) * cameraRadius;
      camera.position.y = cameraHeight;
      camera.lookAt(0, 2, 0);
      previousMousePosition = { x: e.clientX, y: e.clientY };
    }
  };

  const onMouseUp = () => { isDragging = false; };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    cameraRadius = Math.max(8, Math.min(40, cameraRadius + e.deltaY * 0.03));
    camera.position.x = Math.cos(cameraAngle) * cameraRadius;
    camera.position.z = Math.sin(cameraAngle) * cameraRadius;
    camera.lookAt(0, 2, 0);
  };

  const onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };

  renderer.domElement.addEventListener("mousedown", onMouseDown);
  renderer.domElement.addEventListener("mousemove", onMouseMove);
  renderer.domElement.addEventListener("mouseup", onMouseUp);
  renderer.domElement.addEventListener("mouseleave", onMouseUp);
  renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("resize", onResize);

  const dispose = () => {
    renderer.domElement.removeEventListener("mousedown", onMouseDown);
    renderer.domElement.removeEventListener("mousemove", onMouseMove);
    renderer.domElement.removeEventListener("mouseup", onMouseUp);
    renderer.domElement.removeEventListener("mouseleave", onMouseUp);
    renderer.domElement.removeEventListener("wheel", onWheel);
    window.removeEventListener("resize", onResize);
  };

  return { scene, camera, renderer, controls: { dispose } };
}
