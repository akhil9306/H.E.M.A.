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
import { MACHINE_APPROACH, CORRIDOR_Z } from "./types";

export class WorkerRobot {
  public id: number;
  private robot: THREE.Group;
  private parts: RobotParts;
  private scene: THREE.Scene;
  private currentAngles: Record<string, number> = {};
  private walkState: WalkState = { active: false, phase: 0, rafId: null };
  private status: WorkerStatus = "idle";
  private targetMachine: MachineId | null = null;
  private approachZ: number;
  private carriedMesh: THREE.Mesh | null = null;

  constructor(id: number, scene: THREE.Scene, startPosition: THREE.Vector3, approachZ: number = 4) {
    this.id = id;
    this.scene = scene;
    this.approachZ = approachZ;
    const { robot, parts } = createRobot(scene);
    this.robot = robot;
    this.parts = parts;

    this.robot.position.copy(startPosition);
    this.robot.rotation.y = Math.PI;

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

  // ─── Movement ───

  async walkTo(target: THREE.Vector3): Promise<void> {
    this.status = "walking";

    const start = this.robot.position.clone();
    const direction = new THREE.Vector3().subVectors(target, start);
    const distance = direction.length();

    if (distance < 0.1) {
      this.status = "idle";
      return;
    }

    const angle = Math.atan2(direction.x, direction.z);
    this.robot.rotation.y = angle;

    startWalkCycle(this.parts, this.walkState, this.currentAngles);

    const speed = 1.5;
    const duration = (distance / speed) * 1000;

    return new Promise<void>((resolve) => {
      const startTime = performance.now();

      const moveStep = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
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

  async walkToMachine(machineId: MachineId): Promise<void> {
    this.targetMachine = machineId;

    const machineApproach = MACHINE_APPROACH[machineId].clone();
    machineApproach.z = this.approachZ;

    const currentPos = this.robot.position.clone();
    const waypoints: THREE.Vector3[] = [];

    const directDist = currentPos.distanceTo(machineApproach);
    if (directDist < 1.0) {
      waypoints.push(machineApproach);
    } else {
      if (currentPos.z < CORRIDOR_Z - 0.5) {
        waypoints.push(new THREE.Vector3(currentPos.x, 0, CORRIDOR_Z));
      }
      if (Math.abs(currentPos.x - machineApproach.x) > 0.5) {
        waypoints.push(new THREE.Vector3(machineApproach.x, 0, CORRIDOR_Z));
      }
      waypoints.push(machineApproach);
    }

    for (const wp of waypoints) {
      await this.walkTo(wp);
    }
  }

  // ─── Workpiece Carry (external mesh management) ───

  /**
   * Attach an external workpiece mesh to this robot for carrying.
   */
  attachWorkpiece(mesh: THREE.Mesh): void {
    mesh.parent?.remove(mesh);
    // Position between hands in carry pose
    mesh.position.set(0, 1.5, 0.3);
    mesh.rotation.set(0, 0, 0);
    this.robot.add(mesh);
    this.carriedMesh = mesh;
  }

  /**
   * Detach carried workpiece and return it (caller adds back to scene).
   */
  detachWorkpiece(): THREE.Mesh | null {
    if (!this.carriedMesh) return null;
    const mesh = this.carriedMesh;
    this.robot.remove(mesh);
    this.carriedMesh = null;
    return mesh;
  }

  /**
   * Pick up gesture — reach forward/down, grasp, lift up.
   */
  async pickUpGesture(): Promise<void> {
    this.status = "operating";
    this.robot.rotation.y = Math.PI;

    // Reach forward and down
    await Promise.all([
      smoothSetJoint(this.parts, "leftShoulder", -70, 400, this.currentAngles),
      smoothSetJoint(this.parts, "rightShoulder", -70, 400, this.currentAngles),
      smoothSetJoint(this.parts, "leftElbow", 50, 400, this.currentAngles),
      smoothSetJoint(this.parts, "rightElbow", 50, 400, this.currentAngles),
      smoothSetJoint(this.parts, "leftFingers", 0, 200, this.currentAngles),
      smoothSetJoint(this.parts, "rightFingers", 0, 200, this.currentAngles),
    ]);

    await new Promise((r) => setTimeout(r, 300));

    // Close fingers to grasp
    await Promise.all([
      smoothSetJoint(this.parts, "leftFingers", 70, 300, this.currentAngles),
      smoothSetJoint(this.parts, "rightFingers", 70, 300, this.currentAngles),
    ]);

    // Lift up to carry position
    await Promise.all([
      smoothSetJoint(this.parts, "leftShoulder", -30, 400, this.currentAngles),
      smoothSetJoint(this.parts, "rightShoulder", -30, 400, this.currentAngles),
      smoothSetJoint(this.parts, "leftElbow", 60, 400, this.currentAngles),
      smoothSetJoint(this.parts, "rightElbow", 60, 400, this.currentAngles),
    ]);

    this.status = "carrying";
  }

  /**
   * Place down gesture — lower arms, open fingers, step back.
   */
  async placeDownGesture(): Promise<void> {
    this.status = "operating";
    this.robot.rotation.y = Math.PI;

    // Lower to place
    await Promise.all([
      smoothSetJoint(this.parts, "leftShoulder", -65, 400, this.currentAngles),
      smoothSetJoint(this.parts, "rightShoulder", -65, 400, this.currentAngles),
      smoothSetJoint(this.parts, "leftElbow", 45, 400, this.currentAngles),
      smoothSetJoint(this.parts, "rightElbow", 45, 400, this.currentAngles),
    ]);

    await new Promise((r) => setTimeout(r, 200));

    // Open fingers
    await Promise.all([
      smoothSetJoint(this.parts, "leftFingers", 0, 300, this.currentAngles),
      smoothSetJoint(this.parts, "rightFingers", 0, 300, this.currentAngles),
    ]);

    await resetToNeutral(this.parts, this.currentAngles, 400);
    this.status = "idle";
  }

  /**
   * Carry workpiece to a machine: assumes pickUpGesture already called.
   * Walks with carry pose, then places down.
   */
  async carryToMachine(machineId: MachineId): Promise<void> {
    this.status = "carrying";
    await this.walkToMachine(machineId);
  }

  // ─── Specialized Machine Operations ───

  /**
   * Generic operate — fallback for any machine.
   */
  async operateMachine(): Promise<void> {
    this.status = "operating";
    this.robot.rotation.y = Math.PI;

    await Promise.all([
      smoothSetJoint(this.parts, "leftShoulder", -60, 500, this.currentAngles),
      smoothSetJoint(this.parts, "rightShoulder", -60, 500, this.currentAngles),
    ]);
    await Promise.all([
      smoothSetJoint(this.parts, "leftElbow", 40, 400, this.currentAngles),
      smoothSetJoint(this.parts, "rightElbow", 40, 400, this.currentAngles),
    ]);
    await new Promise((r) => setTimeout(r, 1500));
    await resetToNeutral(this.parts, this.currentAngles, 500);
    this.status = "idle";
  }

  /**
   * Cutter operation — pull lever down, hold, release.
   */
  async operateCutter(): Promise<void> {
    this.status = "operating";
    this.robot.rotation.y = Math.PI;

    // Right arm reaches up for lever
    await Promise.all([
      smoothSetJoint(this.parts, "rightShoulder", -80, 500, this.currentAngles),
      smoothSetJoint(this.parts, "rightElbow", 30, 400, this.currentAngles),
      smoothSetJoint(this.parts, "rightFingers", 60, 300, this.currentAngles),
      // Left arm on workpiece
      smoothSetJoint(this.parts, "leftShoulder", -50, 400, this.currentAngles),
      smoothSetJoint(this.parts, "leftElbow", 40, 400, this.currentAngles),
    ]);

    await new Promise((r) => setTimeout(r, 400));

    // Pull lever down
    await Promise.all([
      smoothSetJoint(this.parts, "rightShoulder", -40, 600, this.currentAngles),
      smoothSetJoint(this.parts, "rightElbow", 70, 500, this.currentAngles),
    ]);

    // Hold — cutting action
    await new Promise((r) => setTimeout(r, 1200));

    // Release lever back up
    await Promise.all([
      smoothSetJoint(this.parts, "rightShoulder", -80, 500, this.currentAngles),
      smoothSetJoint(this.parts, "rightElbow", 30, 400, this.currentAngles),
    ]);

    await new Promise((r) => setTimeout(r, 300));

    await resetToNeutral(this.parts, this.currentAngles, 500);
    this.status = "idle";
  }

  /**
   * Roller operation — guide sheet through rollers with push/pull motions.
   */
  async operateRoller(): Promise<void> {
    this.status = "operating";
    this.robot.rotation.y = Math.PI;

    // Both arms forward guiding material
    await Promise.all([
      smoothSetJoint(this.parts, "leftShoulder", -40, 400, this.currentAngles),
      smoothSetJoint(this.parts, "rightShoulder", -40, 400, this.currentAngles),
      smoothSetJoint(this.parts, "leftElbow", 50, 400, this.currentAngles),
      smoothSetJoint(this.parts, "rightElbow", 50, 400, this.currentAngles),
      smoothSetJoint(this.parts, "leftFingers", 40, 300, this.currentAngles),
      smoothSetJoint(this.parts, "rightFingers", 40, 300, this.currentAngles),
    ]);

    // Push/pull cycles — feeding sheet through rollers
    for (let i = 0; i < 3; i++) {
      // Push forward
      await Promise.all([
        smoothSetJoint(this.parts, "leftShoulder", -55, 500, this.currentAngles),
        smoothSetJoint(this.parts, "rightShoulder", -55, 500, this.currentAngles),
      ]);
      // Pull back
      await Promise.all([
        smoothSetJoint(this.parts, "leftShoulder", -30, 500, this.currentAngles),
        smoothSetJoint(this.parts, "rightShoulder", -30, 500, this.currentAngles),
      ]);
    }

    await new Promise((r) => setTimeout(r, 500));
    await resetToNeutral(this.parts, this.currentAngles, 500);
    this.status = "idle";
  }

  /**
   * Press operation — operate control panel, press button, watch.
   */
  async operatePress(): Promise<void> {
    this.status = "operating";
    this.robot.rotation.y = Math.PI;

    // Right arm to control panel (reaching to the side)
    await Promise.all([
      smoothSetJoint(this.parts, "rightShoulder", -45, 500, this.currentAngles),
      smoothSetJoint(this.parts, "rightElbow", 90, 400, this.currentAngles),
      smoothSetJoint(this.parts, "rightFingers", 30, 300, this.currentAngles),
    ]);

    await new Promise((r) => setTimeout(r, 300));

    // Press button — quick elbow snap
    await smoothSetJoint(this.parts, "rightElbow", 70, 200, this.currentAngles);
    await new Promise((r) => setTimeout(r, 100));
    await smoothSetJoint(this.parts, "rightElbow", 90, 200, this.currentAngles);

    // Step back and watch — head tilt to observe
    await smoothSetJoint(this.parts, "headTilt", 15, 300, this.currentAngles);

    // Hold while press operates
    await new Promise((r) => setTimeout(r, 2000));

    await resetToNeutral(this.parts, this.currentAngles, 500);
    this.status = "idle";
  }

  /**
   * Welding operation — torch sweep with observation.
   */
  async operateWelder(): Promise<void> {
    this.status = "operating";
    this.robot.rotation.y = Math.PI;

    // Right arm forward (torch), left arm holds piece
    await Promise.all([
      smoothSetJoint(this.parts, "rightShoulder", -55, 500, this.currentAngles),
      smoothSetJoint(this.parts, "rightElbow", 35, 400, this.currentAngles),
      smoothSetJoint(this.parts, "rightFingers", 50, 300, this.currentAngles),
      smoothSetJoint(this.parts, "leftShoulder", -30, 400, this.currentAngles),
      smoothSetJoint(this.parts, "leftElbow", 60, 400, this.currentAngles),
      smoothSetJoint(this.parts, "leftFingers", 40, 300, this.currentAngles),
      smoothSetJoint(this.parts, "headTilt", 20, 300, this.currentAngles),
    ]);

    // Slow welding sweep — torch arm sweeps across
    await smoothSetJoint(this.parts, "rightShoulder", -65, 1500, this.currentAngles);
    await new Promise((r) => setTimeout(r, 300));
    await smoothSetJoint(this.parts, "rightShoulder", -50, 1500, this.currentAngles);
    await new Promise((r) => setTimeout(r, 300));

    // Second pass
    await smoothSetJoint(this.parts, "rightShoulder", -60, 1000, this.currentAngles);
    await new Promise((r) => setTimeout(r, 500));

    await resetToNeutral(this.parts, this.currentAngles, 500);
    this.status = "idle";
  }

  // ─── State ───

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

  getRobotGroup(): THREE.Group {
    return this.robot;
  }

  dispose(): void {
    if (this.walkState.active && this.walkState.rafId !== null) {
      cancelAnimationFrame(this.walkState.rafId);
    }
    if (this.carriedMesh) {
      this.robot.remove(this.carriedMesh);
      this.carriedMesh = null;
    }
    this.robot.parent?.remove(this.robot);
  }
}
