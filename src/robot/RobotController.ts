import * as THREE from "three";
import { createScene, setupMouseControls, type SceneSetup } from "./createScene";
import { createRobot } from "./createRobot";
import {
  applyJoint,
  smoothSetJoint,
  startWalkCycle,
  stopWalkCycle,
  resetToNeutral,
  waveAnimation,
  greetAnimation,
  pointAnimation,
  lookAtTableAnimation,
  lookAtTarget,
  graspAnimation,
  releaseAnimation,
  type WalkState,
} from "./animations";
import {
  type JointName,
  type ActionName,
  type GraspableObject,
  type RobotParts,
  type RobotState,
  JOINT_LIMITS,
} from "./types";

export class RobotController {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private visionRenderer!: THREE.WebGLRenderer;
  private parts!: RobotParts;
  private robot!: THREE.Group;
  private tableObjects: THREE.Mesh[] = [];
  private animFrameId: number | null = null;
  private initialized = false;
  private container: HTMLDivElement | null = null;

  private currentAngles: Record<JointName, number> = {
    headPan: 0, headTilt: 0,
    leftShoulder: 0, leftElbow: 0, leftFingers: 0,
    rightShoulder: 0, rightElbow: 0, rightFingers: 0,
    leftHip: 0, leftKnee: 0, rightHip: 0, rightKnee: 0,
  };

  private walkState: WalkState = { active: false, phase: 0, rafId: null };
  private graspedObject: GraspableObject | null = null;
  private onStateChange?: () => void;

  setOnStateChange(cb: () => void) {
    this.onStateChange = cb;
  }

  initialize(container: HTMLDivElement, visionCanvas: HTMLCanvasElement): void {
    if (this.initialized) return;
    this.initialized = true;
    this.container = container;

    const setup: SceneSetup = createScene(container, visionCanvas);
    this.scene = setup.scene;
    this.camera = setup.camera;
    this.renderer = setup.renderer;
    this.visionRenderer = setup.visionRenderer;
    this.tableObjects = setup.tableObjects;

    const { robot, parts } = createRobot(this.scene);
    this.robot = robot;
    this.parts = parts;

    console.log("✅ Robot initialized successfully");
    console.log("  - Robot position:", robot.position);
    console.log("  - Camera position:", this.camera.position);
    console.log("  - Container dimensions:", container.clientWidth, "x", container.clientHeight);
    console.log("  - Robot parts:", Object.keys(parts).filter(k => parts[k as keyof RobotParts]));

    setupMouseControls(this.renderer, this.camera);
    this.startAnimationLoop();

    // Handle resize
    const onResize = () => {
      if (!this.container) return;
      const w = this.container.clientWidth || 1280;
      const h = this.container.clientHeight || 720;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // Trigger initial resize after a frame to ensure container has dimensions
    requestAnimationFrame(() => {
      onResize();
    });
  }

  dispose(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.walkState.rafId !== null) {
      cancelAnimationFrame(this.walkState.rafId);
    }
    this.walkState.active = false;
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.visionRenderer) {
      this.visionRenderer.dispose();
    }
    this.initialized = false;
  }

  // --- Joint control ---
  moveJoint(joint: JointName, angleDeg: number): void {
    const limits = JOINT_LIMITS[joint];
    const clamped = Math.max(limits.min, Math.min(limits.max, angleDeg));
    applyJoint(this.parts, joint, clamped);
    this.currentAngles[joint] = clamped;
    this.onStateChange?.();
  }

  async moveJointSmooth(
    joint: JointName,
    angleDeg: number,
    durationMs = 400
  ): Promise<void> {
    const limits = JOINT_LIMITS[joint];
    const clamped = Math.max(limits.min, Math.min(limits.max, angleDeg));
    await smoothSetJoint(this.parts, joint, clamped, durationMs, this.currentAngles);
    this.onStateChange?.();
  }

  // --- Actions ---
  async executeAction(action: ActionName): Promise<string> {
    switch (action) {
      case "walk":
        startWalkCycle(this.parts, this.walkState, this.currentAngles);
        this.onStateChange?.();
        return "Walking started";
      case "stopWalk":
        await stopWalkCycle(this.parts, this.walkState, this.currentAngles);
        this.onStateChange?.();
        return "Walking stopped";
      case "wave":
        await waveAnimation(this.parts, this.currentAngles);
        this.onStateChange?.();
        return "Wave completed";
      case "greet":
        await greetAnimation(this.parts, this.currentAngles);
        this.onStateChange?.();
        return "Greeting completed";
      case "point":
        await pointAnimation(this.parts, this.currentAngles);
        this.onStateChange?.();
        return "Pointing completed";
      case "lookAtTable":
        await lookAtTableAnimation(this.parts, this.currentAngles);
        this.onStateChange?.();
        return "Now looking at table";
      case "reset":
        if (this.walkState.active) {
          await stopWalkCycle(this.parts, this.walkState, this.currentAngles);
        }
        await resetToNeutral(this.parts, this.currentAngles);
        this.graspedObject = null;
        this.onStateChange?.();
        return "Reset to neutral pose";
      default:
        return `Unknown action: ${action}`;
    }
  }

  // --- Grasp ---
  async graspObject(objectName: GraspableObject): Promise<string> {
    if (this.walkState.active) {
      await stopWalkCycle(this.parts, this.walkState, this.currentAngles);
    }
    const result = await graspAnimation(this.parts, objectName, this.currentAngles);
    this.graspedObject = objectName;
    this.onStateChange?.();
    return result;
  }

  async releaseObject(): Promise<string> {
    if (!this.graspedObject) return "No object currently held";
    const result = await releaseAnimation(this.parts, this.currentAngles);
    this.graspedObject = null;
    this.onStateChange?.();
    return result;
  }

  // --- Look at ---
  async lookAt(target: string): Promise<string> {
    await lookAtTarget(this.parts, target, this.currentAngles);
    this.onStateChange?.();
    return `Now looking at ${target}`;
  }

  // --- Vision capture ---
  captureVision(): string {
    if (!this.robot || !this.visionRenderer || !this.parts?.visionCamera) {
      return "";
    }
    this.robot.updateMatrixWorld(true);
    this.parts.visionCamera.updateMatrixWorld(true);
    this.visionRenderer.render(this.scene, this.parts.visionCamera);
    return this.visionRenderer.domElement.toDataURL("image/jpeg", 0.8);
  }

  // --- State ---
  getState(): RobotState {
    return {
      joints: { ...this.currentAngles },
      graspedObject: this.graspedObject,
      isWalking: this.walkState.active,
    };
  }

  getVisionRenderer(): THREE.WebGLRenderer | null {
    return this.visionRenderer || null;
  }

  // --- Detection info for vision panel ---
  getVisionInfo(): { objectsInView: number; closestDistance: number } {
    if (!this.parts?.visionCamera) return { objectsInView: 0, closestDistance: Infinity };

    const camPos = new THREE.Vector3();
    this.parts.visionCamera.getWorldPosition(camPos);
    const dir = new THREE.Vector3();
    this.parts.visionCamera.getWorldDirection(dir);

    let count = 0;
    let closest = Infinity;

    for (const obj of this.tableObjects) {
      const objPos = new THREE.Vector3();
      obj.getWorldPosition(objPos);
      const toObj = objPos.clone().sub(camPos).normalize();
      const angle = dir.angleTo(toObj);

      if (angle < Math.PI / 2.5) {
        count++;
        const d = camPos.distanceTo(objPos);
        closest = Math.min(closest, d);
      }
    }

    return { objectsInView: count, closestDistance: closest };
  }

  // --- Animation loop ---
  private startAnimationLoop(): void {
    let frameCount = 0;
    const animate = () => {
      this.animFrameId = requestAnimationFrame(animate);

      // Eye glow
      const time = Date.now() * 0.003;
      const glow = Math.sin(time) * 0.3 + 0.7;
      if (this.parts?.mainEye) {
        (this.parts.mainEye.material as THREE.MeshStandardMaterial).emissiveIntensity = glow;
      }

      // Idle bob (only when not walking)
      if (this.robot && !this.walkState.active) {
        this.robot.position.y = Math.sin(time * 0.5) * 0.02;
      }

      if (this.robot) {
        this.robot.updateMatrixWorld(true);
      }

      // Main render
      this.renderer.render(this.scene, this.camera);

      // Vision render
      if (this.parts?.visionCamera) {
        this.parts.visionCamera.updateMatrixWorld(true);
        this.visionRenderer.render(this.scene, this.parts.visionCamera);
      }

      // Debug log every 60 frames (~1 second)
      frameCount++;
      if (frameCount === 60) {
        console.log("Render frame 60:");
        console.log("  - Canvas size:", this.renderer.domElement.width, "x", this.renderer.domElement.height);
        console.log("  - Camera position:", this.camera.position);
        console.log("  - Scene children:", this.scene.children.length);
        console.log("  - Robot visible:", this.robot?.visible);
        frameCount = 0;
      }
    };

    this.animFrameId = requestAnimationFrame(animate);
  }
}
