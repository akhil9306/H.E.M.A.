import { CONSTRAINTS, type PipeSpec, type PipeSegment } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validatePipeSpec(spec: PipeSpec): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!spec.totalLength || spec.totalLength <= 0) {
    errors.push("Total pipe length must be greater than 0");
  } else if (spec.totalLength < CONSTRAINTS.minTotalLength) {
    errors.push(`Total length must be at least ${CONSTRAINTS.minTotalLength}m`);
  } else if (spec.totalLength > CONSTRAINTS.maxTotalLength) {
    errors.push(`Total length must not exceed ${CONSTRAINTS.maxTotalLength}m`);
  }

  if (!spec.initialDiameter || spec.initialDiameter <= 0) {
    errors.push("Initial diameter is required");
  } else if (spec.initialDiameter < CONSTRAINTS.rollerDiameterMin) {
    errors.push(`Initial diameter must be at least ${CONSTRAINTS.rollerDiameterMin}m (roller bender minimum)`);
  } else if (spec.initialDiameter > CONSTRAINTS.rollerDiameterMax) {
    errors.push(`Initial diameter must not exceed ${CONSTRAINTS.rollerDiameterMax}m (roller bender maximum)`);
  }

  if (errors.length > 0 && spec.segments.length === 0) {
    return { valid: false, errors, warnings };
  }

  // Validate segments
  let runningDiameter = spec.initialDiameter;
  let usedLength = 0;

  for (let i = 0; i < spec.segments.length; i++) {
    const seg = spec.segments[i]!;
    const label = `Segment ${i + 1}`;

    if (seg.type === "cylinder") {
      // Cylinder segment
      if (seg.height < CONSTRAINTS.minSegmentHeight) {
        errors.push(`${label}: Cylinder height must be at least ${CONSTRAINTS.minSegmentHeight}m`);
      }
      if (seg.height > CONSTRAINTS.rollerHeightMax) {
        errors.push(`${label}: Cylinder height must not exceed ${CONSTRAINTS.rollerHeightMax}m`);
      }
      // Diameter is the running diameter
      seg.diameter = runningDiameter;
      usedLength += seg.height;
    } else if (seg.type === "frustrum") {
      // Frustrum segment
      const topR = runningDiameter / 2;
      const bottomR = (seg.bottomDiameter || runningDiameter) / 2;

      if (topR < CONSTRAINTS.frustrumTopRadiusMin || topR > CONSTRAINTS.frustrumTopRadiusMax) {
        errors.push(`${label}: Top radius ${topR.toFixed(2)}m outside range [${CONSTRAINTS.frustrumTopRadiusMin}, ${CONSTRAINTS.frustrumTopRadiusMax}]m`);
      }
      if (bottomR < CONSTRAINTS.frustrumBottomRadiusMin || bottomR > CONSTRAINTS.frustrumBottomRadiusMax) {
        errors.push(`${label}: Bottom radius ${bottomR.toFixed(2)}m outside range [${CONSTRAINTS.frustrumBottomRadiusMin}, ${CONSTRAINTS.frustrumBottomRadiusMax}]m`);
      }
      if (seg.height < CONSTRAINTS.frustrumHeightMin) {
        errors.push(`${label}: Frustrum height must be at least ${CONSTRAINTS.frustrumHeightMin}m`);
      }
      if (seg.height > CONSTRAINTS.frustrumHeightMax) {
        errors.push(`${label}: Frustrum height must not exceed ${CONSTRAINTS.frustrumHeightMax}m`);
      }

      seg.topDiameter = runningDiameter;
      runningDiameter = seg.bottomDiameter || runningDiameter;
      usedLength += seg.height;
    }
  }

  // Check total length
  if (spec.totalLength > 0 && usedLength > spec.totalLength) {
    errors.push(`Segments total ${usedLength.toFixed(1)}m exceeds pipe length ${spec.totalLength}m`);
  }

  const remainingLength = spec.totalLength - usedLength;
  if (remainingLength > 0 && remainingLength < CONSTRAINTS.minSegmentHeight) {
    warnings.push(
      `Remaining ${remainingLength.toFixed(1)}m is less than minimum segment height (${CONSTRAINTS.minSegmentHeight}m). ` +
      `Consider adjusting segments to use the full length.`
    );
  }

  if (spec.segments.length === 0 && spec.totalLength > CONSTRAINTS.rollerHeightMax) {
    warnings.push(
      `Pipe length ${spec.totalLength}m exceeds max single cylinder height (${CONSTRAINTS.rollerHeightMax}m). ` +
      `It will be split into multiple segments automatically.`
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Auto-fill segments from a spec that may have only required fields.
 * If no segments are defined, creates cylinder segments to fill the total length,
 * splitting into multiple segments if needed.
 */
export function autoFillSegments(spec: PipeSpec): PipeSegment[] {
  if (spec.segments.length > 0) {
    // Calculate used length
    const usedLength = spec.segments.reduce((sum, s) => sum + s.height, 0);
    const remaining = spec.totalLength - usedLength;

    if (remaining >= CONSTRAINTS.minSegmentHeight) {
      // Find the running diameter at the end of defined segments
      let dia = spec.initialDiameter;
      for (const seg of spec.segments) {
        if (seg.type === "frustrum" && seg.bottomDiameter) {
          dia = seg.bottomDiameter;
        }
      }

      // Add remaining as cylinder segments
      const result = [...spec.segments];
      let left = remaining;
      while (left >= CONSTRAINTS.minSegmentHeight) {
        const h = Math.min(left, CONSTRAINTS.rollerHeightMax);
        result.push({ type: "cylinder", height: h, diameter: dia });
        left -= h;
      }
      return result;
    }
    return spec.segments;
  }

  // No segments defined - auto-create from total length
  const segments: PipeSegment[] = [];
  let remaining = spec.totalLength;

  while (remaining >= CONSTRAINTS.minSegmentHeight) {
    const h = Math.min(remaining, CONSTRAINTS.rollerHeightMax);
    segments.push({ type: "cylinder", height: h, diameter: spec.initialDiameter });
    remaining -= h;
  }

  return segments;
}
