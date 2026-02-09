import * as THREE from "three";
import type {
  FactoryAnimParts,
  FactoryDynamicParts,
  MachineParameters,
} from "../types";

import { createMetalSheetStock } from "./createMetalSheetStock";
import { createGuillotineCutter } from "./createGuillotineCutter";
import { createRollingMachine, updateRollerMachine } from "./createRollingMachine";
import { createFrustrumPress, updateFrustrumPress } from "./createFrustrumPress";
import { createWeldingStation } from "./createWeldingStation";
import { createPipeRack, type PipeRackResult } from "./createPipeRack";

export { createMetalSheetStock } from "./createMetalSheetStock";
export { createGuillotineCutter } from "./createGuillotineCutter";
export { createRollingMachine, updateRollerMachine } from "./createRollingMachine";
export { createFrustrumPress, updateFrustrumPress } from "./createFrustrumPress";
export { createWeldingStation } from "./createWeldingStation";
export { createPipeRack, type PipeRackResult } from "./createPipeRack";

export interface MachinesResult {
  groups: Record<string, THREE.Group>;
  animParts: FactoryAnimParts;
  dynamicParts: FactoryDynamicParts;
  pipeRack: PipeRackResult;
}

export function createAllMachines(
  scene: THREE.Scene,
  params: MachineParameters
): MachinesResult {
  const animParts: FactoryAnimParts = {
    bladeRef: null,
    ramRef: null,
    torchRef: null,
    glowRef: null,
    arcLightRef: null,
    sparkParticles: [],
  };

  const dynamicParts: FactoryDynamicParts = {
    topRollerRef: null,
    rearRollerRef: null,
    rollerAdaptorGroup: null,
    pipePreviewRef: null,
    rollerScreenCanvas: null,
    rollerScreenTex: null,
    rollerRackIndicators: [],
    dieGroup: null,
    frustrumPreviewRef: null,
    pressScreenCanvas: null,
    pressScreenTex: null,
    pressRackIndicators: [],
  };

  const groups: Record<string, THREE.Group> = {};

  groups.sheetStock = createMetalSheetStock(scene);
  groups.cutter = createGuillotineCutter(scene, animParts);
  groups.roller = createRollingMachine(scene, params.roller, dynamicParts);
  groups.frustrumPress = createFrustrumPress(scene, params.press, animParts, dynamicParts);
  groups.weldingStation = createWeldingStation(scene, animParts);
  const pipeRack = createPipeRack(scene);
  groups.pipeRack = pipeRack.group;

  return { groups, animParts, dynamicParts, pipeRack };
}
