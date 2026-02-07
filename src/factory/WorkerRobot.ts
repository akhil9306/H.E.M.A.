import * as THREE from "three";
import { createRobot } from "@/robot/createRobot";
import {
  smoothSetJoint,
  startWalkCycle,
  stopWalkCycle,
  resetToNeutral,
  type WalkState,
} from "@/robot/animations";
import type { RobotParts, JointName } from "@/robot/types";
import type { MachineId, WorkerState, WorkerStatus } from "./types";
import { MACHINE_APPROACH } from "./types";

export class WorkerRobot {
  public id: number;
  private robot: THREE.Group;
  private parts: RobotParts;
  private currentAngles: Record<string, number> = {};
  private walkState: WalkState = { active: false, phase: 0, rafId: null };
  private status: WorkerStatus = "idle";
  private targetMachine: MachineId | null = null;

  constructor(id: number, scene: THREE.Scene, startPosition: THREE.Vector3) {
    this.id = id;
    const { robot, parts } = createRobot(scene);
    this.robot = robot;
    this.parts = parts;

    // Position robot at start
    this.robot.position.copy(startPosition);
    // Face toward machines (negative z)
    this.robot.rotation.y = Math.PI;

    // Initialize angles to 0
    const jointNames: JointName[] = [
      "headPan", "headTilt",
      "leftShoulder", "leftElbow", "leftFingers",
      "rightShoulder", "rightElbow", "rightFingers",
      "leftHip", "leftKnee", "rightHip", "rightKnee",
    ];
    for (const j of jointNames) {
      this.currentAngles[j] = 0;
    }
  }

  /**
   * Walk to a target position on the factory floor.
   * Animates the walk cycle while translating the robot.
   */
  async walkTo(target: THREE.Vector3): Promise<void> {
    this.status = "walking";

    const start = this.robot.position.clone();
    const direction = new THREE.Vector3().subVectors(target, start);
    const distance = direction.length();

    if (distance < 0.1) {
      this.status = "idle";
      return;
    }

    // Face the target
    const angle = Math.atan2(direction.x, direction.z);
    this.robot.rotation.y = angle;

    // Start walk cycle
    startWalkCycle(this.parts, this.walkState, this.currentAngles);

    // Move at ~1.5 m/s
    const speed = 1.5;
    const duration = (distance / speed) * 1000;

    return new Promise<void>((resolve) => {
      const startTime = performance.now();

      const moveStep = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / duration, 1);

        // Ease in-out
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        this.robot.position.lerpVectors(start, target, eased);

        if (t < 1) {
          requestAnimationFrame(moveStep);
        } else {
          stopWalkCycle(this.parts, this.walkState, this.currentAngles);
          this.robot.position.copy(target);
          this.status = "idle";
          resolve();
        }
      };

      requestAnimationFrame(moveStep);
    });
  }

  /**
   * Walk to a machine's approach position.
   */
  async walkToMachine(machineId: MachineId): Promise<void> {
    this.targetMachine = machineId;
    const approachPos = MACHINE_APPROACH[machineId].clone();
    await this.walkTo(approachPos);
  }

  /**
   * Perform a machine operation gesture (reach forward, interact).
   */
  async operateMachine(): Promise<void> {
    this.status = "operating";

    // Face the machine (toward negative z)
    this.robot.rotation.y = Math.PI;

    // Reach both arms forward
    await Promise.all([
      smoothSetJoint(this.parts, "leftShoulder", -60, 500, this.currentAngles),
      smoothSetJoint(this.parts, "rightShoulder", -60, 500, this.currentAngles),
    ]);

    await Promise.all([
      smoothSetJoint(this.parts, "leftElbow", 40, 400, this.currentAngles),
      smoothSetJoint(this.parts, "rightElbow", 40, 400, this.currentAngles),
    ]);

    // Hold for operation duration
    await new Promise((r) => setTimeout(r, 1500));

    // Return to neutral
    await resetToNeutral(this.parts, this.currentAngles, 500);

    this.status = "idle";
  }

  /**
   * Carry animation - grasp invisible material and walk.
   */
  async carryToMachine(machineId: MachineId): Promise<void> {
    this.status = "carrying";

    // Close fingers (carrying)
    await Promise.all([
      smoothSetJoint(this.parts, "leftFingers", 70, 300, this.currentAngles),
      smoothSetJoint(this.parts, "rightFingers", 70, 300, this.currentAngles),
      smoothSetJoint(this.parts, "leftShoulder", -30, 300, this.currentAngles),
      smoothSetJoint(this.parts, "rightShoulder", -30, 300, this.currentAngles),
      smoothSetJoint(this.parts, "leftElbow", 60, 300, this.currentAngles),
      smoothSetJoint(this.parts, "rightElbow", 60, 300, this.currentAngles),
    ]);

    // Walk to target
    await this.walkToMachine(machineId);

    // Open fingers (release)
    await Promise.all([
      smoothSetJoint(this.parts, "leftFingers", 0, 300, this.currentAngles),
      smoothSetJoint(this.parts, "rightFingers", 0, 300, this.currentAngles),
    ]);

    await resetToNeutral(this.parts, this.currentAngles, 400);
    this.status = "idle";
  }

  getState(): WorkerState {
    return {
      id: this.id,
      position: {
        x: this.robot.position.x,
        y: this.robot.position.y,
        z: this.robot.position.z,
      },
      targetMachine: this.targetMachine,
      currentStep: null,
      status: this.status,
    };
  }

  getPosition(): THREE.Vector3 {
    return this.robot.position.clone();
  }

  dispose(): void {
    if (this.walkState.active && this.walkState.rafId !== null) {
      cancelAnimationFrame(this.walkState.rafId);
    }
    this.robot.parent?.remove(this.robot);
  }
}
