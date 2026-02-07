import * as THREE from "three";
import {
  type RobotParts,
  type JointName,
  type GraspableObject,
  OBJECT_POSITIONS,
} from "./types";

// Smooth joint interpolation using requestAnimationFrame
export function smoothSetJoint(
  parts: RobotParts,
  joint: JointName,
  targetDeg: number,
  durationMs: number,
  currentAngles: Record<JointName, number>
): Promise<void> {
  return new Promise((resolve) => {
    const startDeg = currentAngles[joint];
    const startTime = performance.now();

    function tick() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      // Ease in-out
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const current = startDeg + (targetDeg - startDeg) * eased;
      applyJoint(parts, joint, current);
      currentAngles[joint] = current;

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(tick);
  });
}

export function applyJoint(
  parts: RobotParts,
  joint: JointName,
  degrees: number
) {
  const rad = THREE.MathUtils.degToRad(degrees);
  switch (joint) {
    case "headPan":
      parts.head.rotation.y = rad;
      break;
    case "headTilt":
      parts.head.rotation.x = rad;
      break;
    case "leftShoulder":
      parts.leftShoulder.rotation.x = rad;
      break;
    case "leftElbow":
      parts.leftElbow.rotation.x = -rad;
      break;
    case "leftFingers":
      setFingers(parts, "left", rad);
      break;
    case "rightShoulder":
      parts.rightShoulder.rotation.x = rad;
      break;
    case "rightElbow":
      parts.rightElbow.rotation.x = -rad;
      break;
    case "rightFingers":
      setFingers(parts, "right", rad);
      break;
    case "leftHip":
      parts.leftHip.rotation.x = rad;
      break;
    case "leftKnee":
      parts.leftKnee.rotation.x = rad;
      break;
    case "rightHip":
      parts.rightHip.rotation.x = rad;
      break;
    case "rightKnee":
      parts.rightKnee.rotation.x = rad;
      break;
  }
}

function setFingers(parts: RobotParts, side: "left" | "right", rad: number) {
  const fingers = side === "left" ? parts.leftFingers : parts.rightFingers;
  fingers.forEach((finger, i) => {
    const bend = rad * (i === 0 ? 0.7 : 1);
    finger.forEach((segment, j) => {
      segment.rotation.x = bend * (j + 1) * 0.5;
    });
  });
}

// --- Walk cycle with improved gait ---
export interface WalkState {
  active: boolean;
  phase: number;
  rafId: number | null;
}

export function startWalkCycle(
  parts: RobotParts,
  state: WalkState,
  currentAngles: Record<JointName, number>
): void {
  if (state.active) return;
  state.active = true;
  state.phase = 0;

  let lastTime = performance.now();

  function tick() {
    if (!state.active) return;

    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    state.phase += dt * 2.5; // ~2.5 rad/s for natural walking pace

    const p = state.phase;

    // Leg kinematics - proper gait phases
    const hipSwing = Math.sin(p) * 25;
    const lKnee = Math.max(0, Math.sin(p) * 40);
    const rKnee = Math.max(0, Math.sin(p + Math.PI) * 40);

    // Torso dynamics
    const torsoBob = Math.sin(p * 2) * 0.015;
    const torsoSway = Math.sin(p) * 0.01;
    parts.torso.position.y = 2.3 + torsoBob;
    parts.torso.position.x = torsoSway;
    parts.torso.rotation.z = Math.sin(p) * 0.02;

    // Apply leg joints
    applyJoint(parts, "leftHip", hipSwing);
    applyJoint(parts, "rightHip", -hipSwing);
    applyJoint(parts, "leftKnee", lKnee);
    applyJoint(parts, "rightKnee", rKnee);

    currentAngles.leftHip = hipSwing;
    currentAngles.rightHip = -hipSwing;
    currentAngles.leftKnee = lKnee;
    currentAngles.rightKnee = rKnee;

    // Arm counterswing
    const armSwing = Math.sin(p) * 15;
    applyJoint(parts, "leftShoulder", armSwing);
    applyJoint(parts, "rightShoulder", -armSwing);
    applyJoint(parts, "leftElbow", 10);
    applyJoint(parts, "rightElbow", 10);

    currentAngles.leftShoulder = armSwing;
    currentAngles.rightShoulder = -armSwing;
    currentAngles.leftElbow = 10;
    currentAngles.rightElbow = 10;

    // Head stabilization
    parts.head.rotation.z = -Math.sin(p) * 0.015;

    state.rafId = requestAnimationFrame(tick);
  }

  state.rafId = requestAnimationFrame(tick);
}

export function stopWalkCycle(
  parts: RobotParts,
  state: WalkState,
  currentAngles: Record<JointName, number>
): Promise<void> {
  state.active = false;
  if (state.rafId !== null) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }

  // Smoothly return to neutral
  return resetToNeutral(parts, currentAngles, 500);
}

export async function resetToNeutral(
  parts: RobotParts,
  currentAngles: Record<JointName, number>,
  duration = 400
): Promise<void> {
  const joints: JointName[] = [
    "headPan", "headTilt",
    "leftShoulder", "leftElbow", "leftFingers",
    "rightShoulder", "rightElbow", "rightFingers",
    "leftHip", "leftKnee", "rightHip", "rightKnee",
  ];

  // Reset torso position
  parts.torso.position.y = 2.3;
  parts.torso.position.x = 0;
  parts.torso.rotation.z = 0;
  parts.head.rotation.z = 0;

  await Promise.all(
    joints.map((j) => smoothSetJoint(parts, j, 0, duration, currentAngles))
  );
}

// --- Wave animation ---
export async function waveAnimation(
  parts: RobotParts,
  currentAngles: Record<JointName, number>
): Promise<void> {
  // Raise right arm
  await Promise.all([
    smoothSetJoint(parts, "rightShoulder", -130, 400, currentAngles),
    smoothSetJoint(parts, "rightElbow", 100, 400, currentAngles),
    smoothSetJoint(parts, "rightFingers", 0, 300, currentAngles),
  ]);

  // Wave back and forth 3 times
  for (let i = 0; i < 3; i++) {
    await smoothSetJoint(parts, "rightElbow", 130, 200, currentAngles);
    await smoothSetJoint(parts, "rightElbow", 80, 200, currentAngles);
  }

  // Return to neutral
  await Promise.all([
    smoothSetJoint(parts, "rightShoulder", 0, 400, currentAngles),
    smoothSetJoint(parts, "rightElbow", 0, 400, currentAngles),
  ]);
}

// --- Greet (namaste) ---
export async function greetAnimation(
  parts: RobotParts,
  currentAngles: Record<JointName, number>
): Promise<void> {
  await Promise.all([
    smoothSetJoint(parts, "leftShoulder", -50, 400, currentAngles),
    smoothSetJoint(parts, "leftElbow", 90, 400, currentAngles),
    smoothSetJoint(parts, "rightShoulder", -50, 400, currentAngles),
    smoothSetJoint(parts, "rightElbow", 90, 400, currentAngles),
    smoothSetJoint(parts, "leftFingers", 0, 300, currentAngles),
    smoothSetJoint(parts, "rightFingers", 0, 300, currentAngles),
    smoothSetJoint(parts, "headTilt", 20, 400, currentAngles),
  ]);

  // Hold for a moment
  await new Promise((r) => setTimeout(r, 800));

  // Return
  await resetToNeutral(parts, currentAngles, 500);
}

// --- Point at table ---
export async function pointAnimation(
  parts: RobotParts,
  currentAngles: Record<JointName, number>
): Promise<void> {
  await Promise.all([
    smoothSetJoint(parts, "headTilt", 20, 300, currentAngles),
    smoothSetJoint(parts, "headPan", 5, 300, currentAngles),
    smoothSetJoint(parts, "rightShoulder", -70, 400, currentAngles),
    smoothSetJoint(parts, "rightElbow", 25, 400, currentAngles),
    smoothSetJoint(parts, "rightFingers", 60, 400, currentAngles),
  ]);

  await new Promise((r) => setTimeout(r, 1000));

  await resetToNeutral(parts, currentAngles, 500);
}

// --- Look at table ---
export async function lookAtTableAnimation(
  parts: RobotParts,
  currentAngles: Record<JointName, number>
): Promise<void> {
  await Promise.all([
    smoothSetJoint(parts, "headPan", 0, 300, currentAngles),
    smoothSetJoint(parts, "headTilt", 30, 300, currentAngles),
  ]);
}

// --- Look at specific target ---
export async function lookAtTarget(
  parts: RobotParts,
  target: string,
  currentAngles: Record<JointName, number>
): Promise<void> {
  if (target === "forward") {
    await Promise.all([
      smoothSetJoint(parts, "headPan", 0, 300, currentAngles),
      smoothSetJoint(parts, "headTilt", 0, 300, currentAngles),
    ]);
    return;
  }

  if (target === "table") {
    await lookAtTableAnimation(parts, currentAngles);
    return;
  }

  // Look at a specific object
  const obj = OBJECT_POSITIONS[target as GraspableObject];
  if (obj) {
    const pan =
      Math.atan2(obj.x, obj.z - 0.5) * (180 / Math.PI);
    const tilt = 25;
    await Promise.all([
      smoothSetJoint(parts, "headPan", pan, 300, currentAngles),
      smoothSetJoint(parts, "headTilt", tilt, 300, currentAngles),
    ]);
  }
}

// --- Grasp object with smooth IK-approximated reach ---
export async function graspAnimation(
  parts: RobotParts,
  objectName: GraspableObject,
  currentAngles: Record<JointName, number>
): Promise<string> {
  const obj = OBJECT_POSITIONS[objectName];
  if (!obj) return `Unknown object: ${objectName}`;

  // Look at the object first
  const headPan = Math.atan2(obj.x, obj.z - 0.5) * (180 / Math.PI);
  await Promise.all([
    smoothSetJoint(parts, "headPan", headPan, 300, currentAngles),
    smoothSetJoint(parts, "headTilt", 25, 300, currentAngles),
  ]);

  // Choose arm based on object side
  const useRight = obj.x >= 0;
  const armPrefix = useRight ? "right" : "left";
  const shoulderKey = `${armPrefix}Shoulder` as JointName;
  const elbowKey = `${armPrefix}Elbow` as JointName;
  const fingersKey = `${armPrefix}Fingers` as JointName;

  // Calculate reach angles using simple 2-link IK approximation
  const dx = obj.x;
  const dz = obj.z - 0.5;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const shoulderAngle = -55 - dist * 8;
  const elbowAngle = 50 + dist * 15;

  // Phase 1: Open hand and begin reach
  await Promise.all([
    smoothSetJoint(parts, fingersKey, 0, 200, currentAngles),
    smoothSetJoint(parts, shoulderKey, shoulderAngle * 0.5, 300, currentAngles),
    smoothSetJoint(parts, elbowKey, elbowAngle * 0.5, 300, currentAngles),
  ]);

  // Phase 2: Full extension
  await Promise.all([
    smoothSetJoint(parts, shoulderKey, shoulderAngle, 300, currentAngles),
    smoothSetJoint(parts, elbowKey, elbowAngle, 300, currentAngles),
  ]);

  // Phase 3: Close fingers to grasp
  await smoothSetJoint(parts, fingersKey, 80, 300, currentAngles);

  // Phase 4: Lift slightly
  await Promise.all([
    smoothSetJoint(
      parts,
      shoulderKey,
      shoulderAngle + 20,
      300,
      currentAngles
    ),
    smoothSetJoint(parts, elbowKey, elbowAngle - 10, 300, currentAngles),
  ]);

  return `Grasped ${obj.color} ${objectName}`;
}

// --- Release object ---
export async function releaseAnimation(
  parts: RobotParts,
  currentAngles: Record<JointName, number>
): Promise<string> {
  // Open both hands
  await Promise.all([
    smoothSetJoint(parts, "leftFingers", 0, 200, currentAngles),
    smoothSetJoint(parts, "rightFingers", 0, 200, currentAngles),
  ]);

  // Return arms
  await Promise.all([
    smoothSetJoint(parts, "leftShoulder", -20, 300, currentAngles),
    smoothSetJoint(parts, "rightShoulder", -20, 300, currentAngles),
  ]);

  await resetToNeutral(parts, currentAngles, 400);

  return "Object released";
}
