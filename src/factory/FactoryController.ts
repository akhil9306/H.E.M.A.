import * as THREE from "three";
import { createFactoryScene, type FactorySceneResult } from "./createFactoryScene";
import { createAllMachines, type MachinesResult } from "./machines";
import { animateFactory, triggerMachineAnimation } from "./factoryAnimations";
import { updateRollerMachine } from "./machines/createRollingMachine";
import { updateFrustrumPress } from "./machines/createFrustrumPress";
import { WorkerRobot } from "./WorkerRobot";
import type {
  FactoryState,
  MachineId,
  MachineParameters,
  ManufacturingStep,
  RollerParams,
  PressParams,
} from "./types";
import {
  MACHINE_IDS,
  MACHINE_APPROACH,
  WORKER_HOME_POSITIONS,
  WORKER_APPROACH_Z,
  WORKPIECE_POSITIONS,
} from "./types";
import { disposeFactoryMaterials, getFactoryMaterials } from "./materials";

const DEFAULT_PARAMS: MachineParameters = {
  roller: { diameter: 1.0, height: 3.0 },
  press: { topRadius: 0.4, bottomRadius: 0.6, frustrumHeight: 0.8 },
};

export class FactoryController {
  private sceneResult: FactorySceneResult | null = null;
  private machinesResult: MachinesResult | null = null;
  private workers: WorkerRobot[] = [];
  private params: MachineParameters = { ...DEFAULT_PARAMS };
  private steps: ManufacturingStep[] = [];
  private isRunning = false;
  private animFrameId: number | null = null;
  private clock = new THREE.Clock();
  private onStateChange?: () => void;

  // Workpiece tracking
  private workpiece: THREE.Mesh | null = null;
  private storedPipes: THREE.Mesh[] = [];
  private nextCradleIndex = 0;

  // Vision system (shared across workers)
  private visionRenderer: THREE.WebGLRenderer | null = null;
  private visionCamera: THREE.PerspectiveCamera | null = null;

  initialize(container: HTMLDivElement): void {
    this.sceneResult = createFactoryScene(container);
    this.machinesResult = createAllMachines(this.sceneResult.scene, this.params);

    // Add 5 worker robots, one per machine
    for (let i = 0; i < MACHINE_IDS.length; i++) {
      const machineId = MACHINE_IDS[i]!;
      this.addWorker(WORKER_HOME_POSITIONS[machineId].clone(), WORKER_APPROACH_Z[i]!);
    }

    this.initializeVision();
    this.animate();
  }

  dispose(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    for (const worker of this.workers) {
      worker.dispose();
    }
    this.workers = [];

    // Clean up workpieces
    this.disposeWorkpiece();
    for (const pipe of this.storedPipes) {
      pipe.parent?.remove(pipe);
      pipe.geometry.dispose();
    }
    this.storedPipes = [];

    // Clean up vision
    if (this.visionRenderer) {
      this.visionRenderer.dispose();
      this.visionRenderer = null;
    }
    this.visionCamera = null;

    if (this.sceneResult) {
      this.sceneResult.controls.dispose();
      this.sceneResult.renderer.dispose();
      this.sceneResult.renderer.domElement.remove();
      this.sceneResult = null;
    }

    this.machinesResult = null;
    disposeFactoryMaterials();
  }

  setOnStateChange(cb: () => void): void {
    this.onStateChange = cb;
  }

  // ─── Vision System ───

  private initializeVision(): void {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    this.visionRenderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    this.visionRenderer.setSize(320, 240);
    this.visionRenderer.setClearColor(0x1a1a2e, 1);
    this.visionCamera = new THREE.PerspectiveCamera(80, 320 / 240, 0.1, 50);
  }

  captureVision(workerId: number): string {
    if (!this.visionRenderer || !this.visionCamera || !this.sceneResult) return "";
    const worker = this.workers[workerId];
    if (!worker) return "";

    const robotGroup = worker.getRobotGroup();
    robotGroup.updateMatrixWorld(true);

    // Position camera at the worker's eye level
    // Head is approximately at y=3.1 in robot local space, slightly forward at z=0.3
    const eyeLocal = new THREE.Vector3(0, 3.1, 0.3);
    const eyeWorld = eyeLocal.applyMatrix4(robotGroup.matrixWorld);
    this.visionCamera.position.copy(eyeWorld);

    // Face the same direction as the robot
    const forwardLocal = new THREE.Vector3(0, 2.8, 2.0);
    const forwardWorld = forwardLocal.applyMatrix4(robotGroup.matrixWorld);
    this.visionCamera.lookAt(forwardWorld);

    this.visionCamera.updateMatrixWorld(true);
    this.visionRenderer.render(this.sceneResult.scene, this.visionCamera);
    return this.visionRenderer.domElement.toDataURL("image/jpeg", 0.8);
  }

  // ─── Worker Management ───

  addWorker(position: THREE.Vector3, approachZ: number = 4): number {
    if (!this.sceneResult) return -1;
    const id = this.workers.length;
    const worker = new WorkerRobot(id, this.sceneResult.scene, position, approachZ);
    this.workers.push(worker);
    return id;
  }

  async moveWorkerToMachine(workerId: number, machineId: MachineId): Promise<string> {
    const worker = this.workers[workerId];
    if (!worker) return `Worker ${workerId} not found`;
    await worker.walkToMachine(machineId);
    this.onStateChange?.();
    return `Worker ${workerId} arrived at ${machineId}`;
  }

  // ─── Machine Operations ───

  setRollerParams(params: RollerParams): void {
    this.params.roller = { ...params };
    if (this.machinesResult) {
      updateRollerMachine(params, this.machinesResult.dynamicParts);
    }
    this.onStateChange?.();
  }

  setPressParams(params: PressParams): void {
    this.params.press = { ...params };
    if (this.machinesResult) {
      updateFrustrumPress(params, this.machinesResult.dynamicParts);
    }
    this.onStateChange?.();
  }

  async triggerMachine(machineId: MachineId, durationMs = 3000): Promise<string> {
    if (!this.machinesResult) return "Factory not initialized";
    await triggerMachineAnimation(machineId, this.machinesResult.animParts, durationMs);
    return `Machine ${machineId} operation completed`;
  }

  // ─── Workpiece Management (public for AI tool calls) ───

  createNewWorkpiece(): THREE.Mesh {
    this.disposeWorkpiece();
    const MATS = getFactoryMaterials();
    const geo = new THREE.BoxGeometry(1.8, 0.04, 1.2);
    const mesh = new THREE.Mesh(geo, MATS.steel);
    mesh.castShadow = true;
    this.workpiece = mesh;
    return mesh;
  }

  placeWorkpieceAtMachine(machineId: MachineId): void {
    if (!this.workpiece || !this.sceneResult) return;
    this.workpiece.parent?.remove(this.workpiece);
    const pos = WORKPIECE_POSITIONS[machineId];
    this.workpiece.position.copy(pos);
    this.workpiece.rotation.set(0, 0, 0);
    this.sceneResult.scene.add(this.workpiece);
  }

  attachWorkpieceToWorker(workerId: number): void {
    if (!this.workpiece) return;
    const worker = this.workers[workerId];
    if (!worker) return;
    worker.attachWorkpiece(this.workpiece);
  }

  detachWorkpieceFromWorker(workerId: number): void {
    const worker = this.workers[workerId];
    if (!worker) return;
    const mesh = worker.detachWorkpiece();
    if (mesh && this.sceneResult) {
      this.sceneResult.scene.add(mesh);
    }
  }

  storeWorkpieceInRack(): void {
    if (!this.workpiece || !this.machinesResult || !this.sceneResult) return;
    const rack = this.machinesResult.pipeRack;
    if (this.nextCradleIndex < rack.cradlePositions.length) {
      this.workpiece.parent?.remove(this.workpiece);
      const cradlePos = rack.cradlePositions[this.nextCradleIndex]!;
      this.workpiece.position.copy(cradlePos);
      this.workpiece.rotation.set(0, 0, Math.PI / 2);
      this.sceneResult.scene.add(this.workpiece);
      this.storedPipes.push(this.workpiece);
      this.nextCradleIndex++;
    }
    this.workpiece = null;
  }

  private disposeWorkpiece(): void {
    if (this.workpiece) {
      this.workpiece.parent?.remove(this.workpiece);
      this.workpiece.geometry.dispose();
      this.workpiece = null;
    }
  }

  // ─── Compound Operations (for AI worker tools) ───

  async fetchSheet(workerId: number): Promise<string> {
    const worker = this.workers[workerId];
    if (!worker) return "Worker not found";
    await worker.pickUpGesture();
    this.createNewWorkpiece();
    this.attachWorkpieceToWorker(workerId);
    this.onStateChange?.();
    return "Fresh sheet picked up from stock and attached for carrying";
  }

  async carryAndPlace(workerId: number, machineId: MachineId): Promise<string> {
    const worker = this.workers[workerId];
    if (!worker) return "Worker not found";
    this.detachWorkpieceFromWorker(workerId);
    this.placeWorkpieceAtMachine(machineId);
    await worker.placeDownGesture();

    // Step aside so machine operator isn't blocked visually
    const machinePos = MACHINE_APPROACH[machineId];
    const standbyPos = new THREE.Vector3(machinePos.x + 3, 0, machinePos.z + 3);
    await worker.walkTo(standbyPos);

    this.onStateChange?.();
    return `Workpiece placed at ${machineId}`;
  }

  async pickUpFrom(workerId: number, machineId: MachineId): Promise<string> {
    const worker = this.workers[workerId];
    if (!worker) return "Worker not found";
    await worker.pickUpGesture();
    this.attachWorkpieceToWorker(workerId);
    this.onStateChange?.();
    return `Picked up workpiece from ${machineId}`;
  }

  async operateMachineWithWorker(workerId: number, machineId: MachineId): Promise<string> {
    const worker = this.workers[workerId];
    if (!worker || !this.machinesResult) return "Not ready";

    switch (machineId) {
      case "cutter":
        await Promise.all([
          worker.operateCutter(),
          this.triggerMachine("cutter", 3000),
        ]);
        break;
      case "roller":
        await Promise.all([
          worker.operateRoller(),
          this.triggerMachine("roller", 4000),
        ]);
        if (this.workpiece) {
          const oldGeo = this.workpiece.geometry;
          const r = this.params.roller.diameter / 2;
          const displayH = Math.min(this.params.roller.height * 0.5, 1.5);
          this.workpiece.geometry = new THREE.CylinderGeometry(r, r, displayH, 32, 1, true);
          oldGeo.dispose();
        }
        break;
      case "press":
        await Promise.all([
          worker.operatePress(),
          this.triggerMachine("press", 3000),
        ]);
        if (this.workpiece) {
          const oldGeo = this.workpiece.geometry;
          const displayH = Math.min(this.params.press.frustrumHeight * 0.5, 1.5);
          this.workpiece.geometry = new THREE.CylinderGeometry(
            this.params.press.topRadius,
            this.params.press.bottomRadius,
            displayH,
            32
          );
          oldGeo.dispose();
        }
        break;
      case "welder":
        await Promise.all([
          worker.operateWelder(),
          this.triggerMachine("welder", 4000),
        ]);
        // Close the open cylinder (weld seam)
        if (this.workpiece) {
          const oldGeo = this.workpiece.geometry;
          if (oldGeo instanceof THREE.CylinderGeometry) {
            const params = oldGeo.parameters;
            this.workpiece.geometry = new THREE.CylinderGeometry(
              params.radiusTop,
              params.radiusBottom,
              params.height,
              32,
              1,
              false
            );
            oldGeo.dispose();
          }
        }
        break;
      default:
        await worker.operateMachine();
        break;
    }

    this.onStateChange?.();
    return `${machineId} operation completed successfully`;
  }

  async storeInRackFromWorker(workerId: number): Promise<string> {
    const worker = this.workers[workerId];
    if (!worker) return "Worker not found";
    this.detachWorkpieceFromWorker(workerId);
    this.storeWorkpieceInRack();
    await worker.placeDownGesture();
    this.onStateChange?.();
    return "Pipe segment stored in rack";
  }

  // ─── Step Tracking ───

  setSteps(steps: ManufacturingStep[]): void {
    this.steps = steps;
    this.onStateChange?.();
  }

  stopExecution(): void {
    this.isRunning = false;
    this.onStateChange?.();
  }

  // ─── State ───

  getState(): FactoryState {
    return {
      workers: this.workers.map((w) => w.getState()),
      machineParams: { ...this.params },
      steps: [...this.steps],
      isRunning: this.isRunning,
    };
  }

  getSteps(): ManufacturingStep[] {
    return this.steps;
  }

  isInitialized(): boolean {
    return this.sceneResult !== null;
  }

  // ─── Animation Loop ───

  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);

    if (!this.sceneResult || !this.machinesResult) return;

    const time = this.clock.getElapsedTime();
    animateFactory(time, this.machinesResult.animParts);
    this.sceneResult.renderer.render(this.sceneResult.scene, this.sceneResult.camera);
  };
}
