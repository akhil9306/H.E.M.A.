import * as THREE from "three";
import type { RobotParts } from "@/robot/types";

// ─── Machine Constraints (derived from machine capabilities) ───
export const CONSTRAINTS = {
  rollerDiameterMin: 0.3,
  rollerDiameterMax: 2.0,
  rollerHeightMin: 1.0,
  rollerHeightMax: 5.0,
  frustrumTopRadiusMin: 0.2,
  frustrumTopRadiusMax: 1.0,
  frustrumBottomRadiusMin: 0.3,
  frustrumBottomRadiusMax: 1.2,
  frustrumHeightMin: 0.3,
  frustrumHeightMax: 1.5,
  minSegmentHeight: 1.0,
  minTotalLength: 1.0,
  maxTotalLength: 50.0,
} as const;

// ─── Pipe Specification ───
export interface PipeSegment {
  type: "cylinder" | "frustrum";
  height: number;
  // For cylinder: uses the running diameter
  diameter?: number;
  // For frustrum: transition diameters
  topDiameter?: number;
  bottomDiameter?: number;
}

export interface PipeSpec {
  totalLength: number;
  initialDiameter: number;
  segments: PipeSegment[];
}

// ─── Manufacturing ───
export type MachineId = "sheetStock" | "cutter" | "roller" | "press" | "welder";

export const MACHINE_POSITIONS: Record<MachineId, THREE.Vector3> = {
  sheetStock: new THREE.Vector3(-12, 0, 0),
  cutter: new THREE.Vector3(-6, 0, 0),
  roller: new THREE.Vector3(0, 0, 0),
  press: new THREE.Vector3(6, 0, 0),
  welder: new THREE.Vector3(12, 0, 0),
};

// Worker approach positions (offset in Z so robot stands in front of machine)
export const MACHINE_APPROACH: Record<MachineId, THREE.Vector3> = {
  sheetStock: new THREE.Vector3(-12, 0, 4),
  cutter: new THREE.Vector3(-6, 0, 4),
  roller: new THREE.Vector3(0, 0, 4),
  press: new THREE.Vector3(6, 0, 4),
  welder: new THREE.Vector3(12, 0, 4),
};

export type StepAction =
  | "fetch_sheet"
  | "cut_sheet"
  | "bend_cylinder"
  | "press_frustrum"
  | "weld_seam"
  | "weld_sections";

export interface ManufacturingStep {
  id: string;
  machineId: MachineId;
  action: StepAction;
  description: string;
  params: Record<string, number>;
  segmentIndex: number;
  status: "pending" | "in_progress" | "completed" | "failed";
  workerId?: number;
}

// ─── Worker Robot ───
export type WorkerStatus = "idle" | "walking" | "operating" | "carrying";

export interface WorkerState {
  id: number;
  position: { x: number; y: number; z: number };
  targetMachine: MachineId | null;
  currentStep: ManufacturingStep | null;
  status: WorkerStatus;
}

// ─── Factory Animation Parts ───
export interface FactoryAnimParts {
  bladeRef: THREE.Mesh | null;
  ramRef: THREE.Mesh | null;
  torchRef: THREE.Mesh | null;
  glowRef: THREE.Mesh | null;
  arcLightRef: THREE.PointLight | null;
  sparkParticles: THREE.Mesh[];
}

// ─── Dynamic Parts (update with parameters) ───
export interface FactoryDynamicParts {
  // Roller bender
  topRollerRef: THREE.Mesh | null;
  rearRollerRef: THREE.Mesh | null;
  rollerAdaptorGroup: THREE.Group | null;
  pipePreviewRef: THREE.Group | null;
  rollerScreenCanvas: HTMLCanvasElement | null;
  rollerScreenTex: THREE.CanvasTexture | null;
  rollerRackIndicators: Array<{ mesh: THREE.Mesh; size: number }>;
  // Frustrum press
  dieGroup: THREE.Group | null;
  frustrumPreviewRef: THREE.Group | null;
  pressScreenCanvas: HTMLCanvasElement | null;
  pressScreenTex: THREE.CanvasTexture | null;
  pressRackIndicators: Array<{ mesh: THREE.Mesh; tr: number; br: number }>;
}

// ─── Machine Parameters ───
export interface RollerParams {
  diameter: number;
  height: number;
}

export interface PressParams {
  topRadius: number;
  bottomRadius: number;
  frustrumHeight: number;
}

export interface MachineParameters {
  roller: RollerParams;
  press: PressParams;
}

// ─── Factory State ───
export interface FactoryState {
  workers: WorkerState[];
  machineParams: MachineParameters;
  steps: ManufacturingStep[];
  isRunning: boolean;
}
