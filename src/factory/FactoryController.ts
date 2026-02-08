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

  initialize(container: HTMLDivElement): void {
    this.sceneResult = createFactoryScene(container);
    this.machinesResult = createAllMachines(this.sceneResult.scene, this.params);

    // Add 5 worker robots, one per machine
    for (let i = 0; i < MACHINE_IDS.length; i++) {
      const machineId = MACHINE_IDS[i]!;
      this.addWorker(WORKER_HOME_POSITIONS[machineId].clone(), WORKER_APPROACH_Z[i]!);
    }

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

  // ─── Workpiece Management ───

  private createWorkpiece(): THREE.Mesh {
    this.disposeWorkpiece();
    const MATS = getFactoryMaterials();
    const geo = new THREE.BoxGeometry(0.8, 0.02, 0.5);
    const mesh = new THREE.Mesh(geo, MATS.steel);
    mesh.castShadow = true;
    this.workpiece = mesh;
    return mesh;
  }

  private placeWorkpieceAtMachine(machineId: MachineId): void {
    if (!this.workpiece || !this.sceneResult) return;
    // Remove from robot if attached
    this.workpiece.parent?.remove(this.workpiece);
    const pos = WORKPIECE_POSITIONS[machineId];
    this.workpiece.position.copy(pos);
    this.workpiece.rotation.set(0, 0, 0);
    this.sceneResult.scene.add(this.workpiece);
  }

  private attachWorkpieceToWorker(workerId: number): void {
    if (!this.workpiece) return;
    const worker = this.workers[workerId];
    if (!worker) return;
    worker.attachWorkpiece(this.workpiece);
  }

  private detachWorkpieceFromWorker(workerId: number): void {
    const worker = this.workers[workerId];
    if (!worker) return;
    const mesh = worker.detachWorkpiece();
    if (mesh && this.sceneResult) {
      this.sceneResult.scene.add(mesh);
    }
  }

  private transformWorkpieceToCylinder(diameter: number, height: number): void {
    if (!this.workpiece) return;
    const oldGeo = this.workpiece.geometry;
    const r = diameter / 2;
    // Scale height for display (max 1.0 visual units)
    const displayH = Math.min(height * 0.3, 1.0);
    this.workpiece.geometry = new THREE.CylinderGeometry(r * 0.4, r * 0.4, displayH, 32, 1, true);
    oldGeo.dispose();
  }

  private transformWorkpieceToFrustrum(topR: number, bottomR: number, height: number): void {
    if (!this.workpiece) return;
    const oldGeo = this.workpiece.geometry;
    const displayH = Math.min(height * 0.3, 1.0);
    this.workpiece.geometry = new THREE.CylinderGeometry(topR * 0.4, bottomR * 0.4, displayH, 32);
    oldGeo.dispose();
  }

  private closeWorkpiece(): void {
    if (!this.workpiece) return;
    const oldGeo = this.workpiece.geometry;
    // Close the open cylinder (remake with openEnded=false)
    if (oldGeo instanceof THREE.CylinderGeometry) {
      const params = oldGeo.parameters;
      this.workpiece.geometry = new THREE.CylinderGeometry(
        params.radiusTop, params.radiusBottom, params.height, 32, 1, false
      );
      oldGeo.dispose();
    }
  }

  private storeWorkpieceInRack(): void {
    if (!this.workpiece || !this.machinesResult || !this.sceneResult) return;
    const rack = this.machinesResult.pipeRack;
    if (this.nextCradleIndex < rack.cradlePositions.length) {
      this.workpiece.parent?.remove(this.workpiece);
      const cradlePos = rack.cradlePositions[this.nextCradleIndex]!;
      this.workpiece.position.copy(cradlePos);
      this.workpiece.rotation.set(0, 0, Math.PI / 2); // lay pipe horizontally
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

  // ─── Step Execution ───

  setSteps(steps: ManufacturingStep[]): void {
    this.steps = steps;
    this.onStateChange?.();
  }

  /**
   * Execute the full manufacturing workflow.
   * Worker 0 (transporter) carries material between machines.
   * Workers 1-4 (machine operators) perform specialized operations.
   */
  async executeAllSteps(): Promise<void> {
    this.isRunning = true;
    this.onStateChange?.();

    const transporter = this.workers[0]!;
    const cutterWorker = this.workers[1]!;
    const rollerWorker = this.workers[2]!;
    const pressWorker = this.workers[3]!;
    const welderWorker = this.workers[4]!;

    // Group steps by segment
    const segmentGroups = new Map<number, ManufacturingStep[]>();
    for (const step of this.steps) {
      const group = segmentGroups.get(step.segmentIndex) || [];
      group.push(step);
      segmentGroups.set(step.segmentIndex, group);
    }

    // Find the actual segment processing groups (not weld_sections)
    const segmentIndices = [...segmentGroups.keys()].sort((a, b) => a - b);

    for (const segIdx of segmentIndices) {
      if (!this.isRunning) break;

      const segSteps = segmentGroups.get(segIdx)!;
      const fetchStep = segSteps.find(s => s.action === "fetch_sheet");
      const cutStep = segSteps.find(s => s.action === "cut_sheet");
      const bendStep = segSteps.find(s => s.action === "bend_cylinder");
      const pressStep = segSteps.find(s => s.action === "press_frustrum");
      const weldSeamStep = segSteps.find(s => s.action === "weld_seam");
      const weldSectionsSteps = segSteps.filter(s => s.action === "weld_sections");

      // ── Phase 1: Fetch sheet from stock ──
      if (fetchStep) {
        fetchStep.status = "in_progress";
        fetchStep.workerId = 0;
        this.onStateChange?.();

        // Transporter walks to sheet stock
        await transporter.walkToMachine("sheetStock");
        await transporter.pickUpGesture();

        // Create visible workpiece and attach to transporter
        this.createWorkpiece();
        this.attachWorkpieceToWorker(0);

        fetchStep.status = "completed";
        this.onStateChange?.();
      }

      // ── Phase 2: Carry to cutter, cut ──
      if (cutStep && this.workpiece) {
        cutStep.status = "in_progress";
        cutStep.workerId = 1;
        this.onStateChange?.();

        // Transporter carries sheet to cutter
        await transporter.carryToMachine("cutter");
        this.detachWorkpieceFromWorker(0);
        this.placeWorkpieceAtMachine("cutter");
        await transporter.placeDownGesture();

        // Cutter worker operates the cutter
        await cutterWorker.walkToMachine("cutter");
        await Promise.all([
          cutterWorker.operateCutter(),
          this.triggerMachine("cutter", 3000),
        ]);

        cutStep.status = "completed";
        this.onStateChange?.();

        // Transporter picks up from cutter
        await transporter.walkToMachine("cutter");
        await transporter.pickUpGesture();
        this.attachWorkpieceToWorker(0);
      }

      // ── Phase 3: Bend on roller OR press frustrum ──
      if (bendStep && this.workpiece) {
        bendStep.status = "in_progress";
        bendStep.workerId = 2;
        this.onStateChange?.();

        // Set roller params
        if (bendStep.params.diameter !== undefined) {
          this.setRollerParams({
            diameter: bendStep.params.diameter,
            height: bendStep.params.height ?? 3.0,
          });
        }

        // Transporter carries to roller
        await transporter.carryToMachine("roller");
        this.detachWorkpieceFromWorker(0);
        this.placeWorkpieceAtMachine("roller");
        await transporter.placeDownGesture();

        // Roller worker operates
        await rollerWorker.walkToMachine("roller");
        await Promise.all([
          rollerWorker.operateRoller(),
          this.triggerMachine("roller", 4000),
        ]);

        // Transform workpiece to cylinder
        this.transformWorkpieceToCylinder(
          bendStep.params.diameter ?? 1.0,
          bendStep.params.height ?? 3.0
        );

        bendStep.status = "completed";
        this.onStateChange?.();

        // Transporter picks up
        await transporter.walkToMachine("roller");
        await transporter.pickUpGesture();
        this.attachWorkpieceToWorker(0);

      } else if (pressStep && this.workpiece) {
        pressStep.status = "in_progress";
        pressStep.workerId = 3;
        this.onStateChange?.();

        // Set press params
        if (pressStep.params.topRadius !== undefined) {
          this.setPressParams({
            topRadius: pressStep.params.topRadius,
            bottomRadius: pressStep.params.bottomRadius ?? 0.6,
            frustrumHeight: pressStep.params.frustrumHeight ?? 0.8,
          });
        }

        // Transporter carries to press
        await transporter.carryToMachine("press");
        this.detachWorkpieceFromWorker(0);
        this.placeWorkpieceAtMachine("press");
        await transporter.placeDownGesture();

        // Press worker operates
        await pressWorker.walkToMachine("press");
        await Promise.all([
          pressWorker.operatePress(),
          this.triggerMachine("press", 3000),
        ]);

        // Transform workpiece to frustrum
        this.transformWorkpieceToFrustrum(
          pressStep.params.topRadius ?? 0.4,
          pressStep.params.bottomRadius ?? 0.6,
          pressStep.params.frustrumHeight ?? 0.8
        );

        pressStep.status = "completed";
        this.onStateChange?.();

        // Transporter picks up
        await transporter.walkToMachine("press");
        await transporter.pickUpGesture();
        this.attachWorkpieceToWorker(0);
      }

      // ── Phase 4: Weld seam ──
      if (weldSeamStep && this.workpiece) {
        weldSeamStep.status = "in_progress";
        weldSeamStep.workerId = 4;
        this.onStateChange?.();

        // Transporter carries to welder
        await transporter.carryToMachine("welder");
        this.detachWorkpieceFromWorker(0);
        this.placeWorkpieceAtMachine("welder");
        await transporter.placeDownGesture();

        // Welder worker operates
        await welderWorker.walkToMachine("welder");
        await Promise.all([
          welderWorker.operateWelder(),
          this.triggerMachine("welder", 4000),
        ]);

        // Close the cylinder (weld seam closed)
        this.closeWorkpiece();

        weldSeamStep.status = "completed";
        this.onStateChange?.();

        // Transporter picks up finished piece
        await transporter.walkToMachine("welder");
        await transporter.pickUpGesture();
        this.attachWorkpieceToWorker(0);
      }

      // ── Phase 5: Store in pipe rack ──
      if (this.workpiece) {
        await transporter.carryToMachine("pipeRack");
        this.detachWorkpieceFromWorker(0);
        this.storeWorkpieceInRack();
        await transporter.placeDownGesture();
      }

      // ── Phase 6: Weld sections together (if any) ──
      for (const weldSectionStep of weldSectionsSteps) {
        if (!this.isRunning) break;
        weldSectionStep.status = "in_progress";
        weldSectionStep.workerId = 4;
        this.onStateChange?.();

        // Transporter retrieves from rack for assembly welding
        await transporter.walkToMachine("pipeRack");
        await transporter.pickUpGesture();

        // Create a simple representation for the assembly weld
        const assemblyPiece = this.createWorkpiece();
        this.transformWorkpieceToCylinder(1.0, 2.0);
        this.attachWorkpieceToWorker(0);

        await transporter.carryToMachine("welder");
        this.detachWorkpieceFromWorker(0);
        this.placeWorkpieceAtMachine("welder");
        await transporter.placeDownGesture();

        await welderWorker.walkToMachine("welder");
        await Promise.all([
          welderWorker.operateWelder(),
          this.triggerMachine("welder", 4000),
        ]);

        weldSectionStep.status = "completed";
        this.onStateChange?.();

        // Store welded assembly back in rack
        await transporter.walkToMachine("welder");
        await transporter.pickUpGesture();
        this.attachWorkpieceToWorker(0);
        await transporter.carryToMachine("pipeRack");
        this.detachWorkpieceFromWorker(0);
        this.storeWorkpieceInRack();
        await transporter.placeDownGesture();
      }
    }

    this.isRunning = false;
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
