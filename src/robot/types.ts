import * as THREE from "three";

export type JointName =
  | "headPan"
  | "headTilt"
  | "leftShoulder"
  | "leftElbow"
  | "leftFingers"
  | "rightShoulder"
  | "rightElbow"
  | "rightFingers"
  | "leftHip"
  | "leftKnee"
  | "rightHip"
  | "rightKnee";

export type ActionName =
  | "walk"
  | "stopWalk"
  | "wave"
  | "greet"
  | "point"
  | "lookAtTable"
  | "reset";

export type GraspableObject =
  | "cube"
  | "sphere"
  | "cylinder"
  | "cone"
  | "cuboid"
  | "torus";

export interface JointLimits {
  min: number;
  max: number;
  default: number;
}

export const JOINT_LIMITS: Record<JointName, JointLimits> = {
  headPan: { min: -90, max: 90, default: 0 },
  headTilt: { min: -60, max: 60, default: 0 },
  leftShoulder: { min: -180, max: 180, default: 0 },
  leftElbow: { min: 0, max: 150, default: 0 },
  leftFingers: { min: 0, max: 90, default: 0 },
  rightShoulder: { min: -180, max: 180, default: 0 },
  rightElbow: { min: 0, max: 150, default: 0 },
  rightFingers: { min: 0, max: 90, default: 0 },
  leftHip: { min: -120, max: 120, default: 0 },
  leftKnee: { min: 0, max: 150, default: 0 },
  rightHip: { min: -120, max: 120, default: 0 },
  rightKnee: { min: 0, max: 150, default: 0 },
};

export interface RobotState {
  joints: Record<JointName, number>;
  graspedObject: GraspableObject | null;
  isWalking: boolean;
}

export interface RobotParts {
  torso: THREE.Group;
  head: THREE.Group;
  neck: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  leftHand: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  rightHand: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  mainEye: THREE.Mesh;
  visionCamera: THREE.PerspectiveCamera;
  leftFingers: THREE.Group[][];
  rightFingers: THREE.Group[][];
}

export const OBJECT_POSITIONS: Record<
  GraspableObject,
  { x: number; y: number; z: number; color: string }
> = {
  cube: { x: -0.6, y: 2.32, z: 1.5, color: "Red" },
  sphere: { x: -0.3, y: 2.32, z: 1.65, color: "Blue" },
  cylinder: { x: 0, y: 2.32, z: 1.8, color: "Green" },
  cuboid: { x: 0.35, y: 2.32, z: 2.0, color: "Yellow" },
  cone: { x: 0.65, y: 2.32, z: 1.55, color: "Magenta" },
  torus: { x: -0.15, y: 2.32, z: 2.25, color: "Cyan" },
};

export const COLORS = {
  torso: 0xffffff,
  torsoInner: 0x222222,
  head: 0x050505,
  limb: 0xffffff,
  limbInner: 0x222222,
  joint: 0x111111,
  hand: 0x111111,
  finger: 0xcccccc,
  foot: 0x111111,
  eye: 0x00aaff,
  table: 0x8b4513,
};
