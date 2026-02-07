import type { PipeSpec, PipeSegment, ManufacturingStep, StepAction } from "./types";
import { autoFillSegments } from "./pipeValidator";

let stepCounter = 0;

function makeStep(
  machineId: ManufacturingStep["machineId"],
  action: StepAction,
  description: string,
  params: Record<string, number>,
  segmentIndex: number
): ManufacturingStep {
  return {
    id: `step-${++stepCounter}`,
    machineId,
    action,
    description,
    params,
    segmentIndex,
    status: "pending",
  };
}

/**
 * Convert a validated PipeSpec into an ordered list of manufacturing steps.
 * Each segment goes through: fetch sheet → cut → bend/press → weld seam
 * Then all segments are welded together.
 */
export function breakdownPipeSpec(spec: PipeSpec): ManufacturingStep[] {
  stepCounter = 0;
  const steps: ManufacturingStep[] = [];
  const segments = autoFillSegments(spec);

  let runningDiameter = spec.initialDiameter;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;

    if (seg.type === "cylinder") {
      const diameter = seg.diameter || runningDiameter;
      const circumference = Math.PI * diameter;

      // 1. Fetch metal sheet from stock
      steps.push(makeStep(
        "sheetStock", "fetch_sheet",
        `Fetch metal sheet for cylinder segment ${i + 1} (${diameter.toFixed(1)}m dia, ${seg.height.toFixed(1)}m tall)`,
        { width: circumference, height: seg.height },
        i
      ));

      // 2. Cut sheet to size
      steps.push(makeStep(
        "cutter", "cut_sheet",
        `Cut sheet to ${circumference.toFixed(2)}m x ${seg.height.toFixed(1)}m for cylinder segment ${i + 1}`,
        { width: circumference, height: seg.height },
        i
      ));

      // 3. Bend into cylinder on roller
      steps.push(makeStep(
        "roller", "bend_cylinder",
        `Bend sheet into cylinder: diameter ${diameter.toFixed(1)}m, height ${seg.height.toFixed(1)}m`,
        { diameter, height: seg.height },
        i
      ));

      // 4. Weld longitudinal seam
      steps.push(makeStep(
        "welder", "weld_seam",
        `Weld longitudinal seam on cylinder segment ${i + 1}`,
        { diameter, height: seg.height },
        i
      ));

    } else if (seg.type === "frustrum") {
      const topDia = seg.topDiameter || runningDiameter;
      const bottomDia = seg.bottomDiameter || runningDiameter;
      const topR = topDia / 2;
      const bottomR = bottomDia / 2;

      // Approximate sheet size for frustrum (slant height calculation)
      const slantHeight = Math.sqrt(seg.height ** 2 + (bottomR - topR) ** 2);
      const avgCircumference = Math.PI * (topDia + bottomDia) / 2;

      // 1. Fetch sheet
      steps.push(makeStep(
        "sheetStock", "fetch_sheet",
        `Fetch metal sheet for frustrum segment ${i + 1} (${topDia.toFixed(1)}m → ${bottomDia.toFixed(1)}m)`,
        { width: avgCircumference, height: slantHeight },
        i
      ));

      // 2. Cut sheet
      steps.push(makeStep(
        "cutter", "cut_sheet",
        `Cut sheet for frustrum segment ${i + 1}`,
        { width: avgCircumference, height: slantHeight },
        i
      ));

      // 3. Press frustrum
      steps.push(makeStep(
        "press", "press_frustrum",
        `Press frustrum: top radius ${topR.toFixed(2)}m, bottom radius ${bottomR.toFixed(2)}m, height ${seg.height.toFixed(1)}m`,
        { topRadius: topR, bottomRadius: bottomR, frustrumHeight: seg.height },
        i
      ));

      // 4. Weld seam
      steps.push(makeStep(
        "welder", "weld_seam",
        `Weld longitudinal seam on frustrum segment ${i + 1}`,
        { topRadius: topR, bottomRadius: bottomR, height: seg.height },
        i
      ));

      runningDiameter = bottomDia;
    }
  }

  // Final assembly: weld all sections together
  if (segments.length > 1) {
    for (let i = 1; i < segments.length; i++) {
      steps.push(makeStep(
        "welder", "weld_sections",
        `Weld segment ${i} to segment ${i + 1} (circumferential weld)`,
        { sectionA: i - 1, sectionB: i },
        i
      ));
    }
  }

  return steps;
}
