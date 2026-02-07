import * as THREE from "three";
import { createFactoryScene, type FactorySceneResult } from "./createFactoryScene";
import { createAllMachines, type MachinesResult } from "./machines";
import { animateFactory, triggerMachineAnimation } from "./factoryAnimations";
import { updateRollerMachine } from "./machines/createRollingMachine";
import { updateFrustrumPress } from "./machines/createFrustrumPress";
import { WorkerRobot } from "./WorkerRobot";
import type {
  FactoryAnimParts,
  FactoryDynamicParts,
  FactoryState,
  MachineId,
  MachineParameters,
  ManufacturingStep,
  RollerParams,
  PressParams,
  WorkerState,
} from "./types";
import { disposeFactoryMaterials } from "./materials";

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

  initialize(container: HTMLDivElement): void {
    this.sceneResult = createFactoryScene(container);
    this.machinesResult = createAllMachines(this.sceneResult.scene, this.params);

    // Add 2 worker robots at starting positions
    this.addWorker(new THREE.Vector3(-4, 0, 6));
    this.addWorker(new THREE.Vector3(4, 0, 6));

    // Start animation loop
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

  addWorker(position: THREE.Vector3): number {
    if (!this.sceneResult) return -1;
    const id = this.workers.length;
    const worker = new WorkerRobot(id, this.sceneResult.scene, position);
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

  // ─── Step Execution ───

  setSteps(steps: ManufacturingStep[]): void {
    this.steps = steps;
    this.onStateChange?.();
  }

  async executeStep(step: ManufacturingStep): Promise<string> {
    step.status = "in_progress";
    this.onStateChange?.();

    const workerId = step.workerId ?? 0;
    const worker = this.workers[workerId];
    if (!worker) {
      step.status = "failed";
      this.onStateChange?.();
      return `Worker ${workerId} not found`;
    }

    try {
      // Walk to the machine
      await worker.walkToMachine(step.machineId);

      // Set machine parameters if applicable
      if (step.action === "bend_cylinder" && step.params.diameter !== undefined) {
        this.setRollerParams({
          diameter: step.params.diameter!,
          height: step.params.height!,
        });
      } else if (step.action === "press_frustrum" && step.params.topRadius !== undefined) {
        this.setPressParams({
          topRadius: step.params.topRadius!,
          bottomRadius: step.params.bottomRadius!,
          frustrumHeight: step.params.frustrumHeight!,
        });
      }

      // Operate the machine
      await worker.operateMachine();
      await this.triggerMachine(step.machineId);

      step.status = "completed";
      this.onStateChange?.();
      return `Step "${step.description}" completed`;
    } catch (err: any) {
      step.status = "failed";
      this.onStateChange?.();
      return `Step failed: ${err.message}`;
    }
  }

  /**
   * Execute all steps sequentially, distributing across workers.
   */
  async executeAllSteps(): Promise<void> {
    this.isRunning = true;
    this.onStateChange?.();

    for (let i = 0; i < this.steps.length; i++) {
      if (!this.isRunning) break;

      const step = this.steps[i]!;
      // Round-robin worker assignment
      step.workerId = i % this.workers.length;
      await this.executeStep(step);
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

    // Animate machines
    animateFactory(time, this.machinesResult.animParts);

    // Render
    this.sceneResult.renderer.render(this.sceneResult.scene, this.sceneResult.camera);
  };
}
