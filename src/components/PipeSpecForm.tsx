import { useState, useCallback } from "react";
import { CONSTRAINTS, type PipeSpec, type PipeSegment } from "@/factory/types";
import { validatePipeSpec } from "@/factory/pipeValidator";
import { SegmentEditor } from "./SegmentEditor";

interface PipeSpecFormProps {
  onSubmit: (spec: PipeSpec) => void;
  disabled?: boolean;
}

export function PipeSpecForm({ onSubmit, disabled }: PipeSpecFormProps) {
  const [totalLength, setTotalLength] = useState(10);
  const [initialDiameter, setInitialDiameter] = useState(1.0);
  const [segments, setSegments] = useState<PipeSegment[]>([]);

  const spec: PipeSpec = { totalLength, initialDiameter, segments };
  const validation = validatePipeSpec(spec);

  // Calculate running diameter for each segment
  const getRunningDiameter = useCallback(
    (upToIndex: number): number => {
      let dia = initialDiameter;
      for (let i = 0; i < upToIndex && i < segments.length; i++) {
        const seg = segments[i]!;
        if (seg.type === "frustrum" && seg.bottomDiameter) {
          dia = seg.bottomDiameter;
        }
      }
      return dia;
    },
    [initialDiameter, segments]
  );

  const usedLength = segments.reduce((sum, s) => sum + s.height, 0);
  const remainingLength = totalLength - usedLength;

  const addSegment = () => {
    const dia = getRunningDiameter(segments.length);
    setSegments([
      ...segments,
      {
        type: "cylinder",
        height: Math.min(
          Math.max(remainingLength, CONSTRAINTS.minSegmentHeight),
          CONSTRAINTS.rollerHeightMax
        ),
        diameter: dia,
      },
    ]);
  };

  const updateSegment = (index: number, seg: PipeSegment) => {
    const updated = [...segments];
    updated[index] = seg;
    setSegments(updated);
  };

  const deleteSegment = (index: number) => {
    setSegments(segments.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (validation.valid && !disabled) {
      onSubmit(spec);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>PIPE SPECIFICATION</div>

      {/* Required fields */}
      <div style={styles.section}>
        <div style={styles.fieldRow}>
          <label style={styles.label}>Total Length:</label>
          <input
            type="number"
            step="0.5"
            min={CONSTRAINTS.minTotalLength}
            max={CONSTRAINTS.maxTotalLength}
            value={totalLength}
            onChange={(e) => setTotalLength(parseFloat(e.target.value) || 0)}
            style={styles.input}
            disabled={disabled}
          />
          <span style={styles.unit}>m</span>
        </div>

        <div style={styles.fieldRow}>
          <label style={styles.label}>Initial Dia:</label>
          <input
            type="number"
            step="0.1"
            min={CONSTRAINTS.rollerDiameterMin}
            max={CONSTRAINTS.rollerDiameterMax}
            value={initialDiameter}
            onChange={(e) => setInitialDiameter(parseFloat(e.target.value) || 0)}
            style={styles.input}
            disabled={disabled}
          />
          <span style={styles.unit}>m</span>
        </div>

        <div style={styles.lengthInfo}>
          <span>Used: {usedLength.toFixed(1)}m</span>
          <span>Remaining: {remainingLength.toFixed(1)}m</span>
        </div>
      </div>

      {/* Segments */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>SEGMENTS (optional)</div>
        <div style={styles.segmentList}>
          {segments.map((seg, i) => (
            <SegmentEditor
              key={i}
              index={i}
              segment={seg}
              runningDiameter={getRunningDiameter(i)}
              onChange={updateSegment}
              onDelete={deleteSegment}
            />
          ))}
        </div>

        {!disabled && (
          <button onClick={addSegment} style={styles.addBtn}>
            + ADD SEGMENT
          </button>
        )}
      </div>

      {/* Validation */}
      {validation.errors.length > 0 && (
        <div style={styles.errors}>
          {validation.errors.map((e, i) => (
            <div key={i} style={styles.error}>{e}</div>
          ))}
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div style={styles.warnings}>
          {validation.warnings.map((w, i) => (
            <div key={i} style={styles.warning}>{w}</div>
          ))}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!validation.valid || disabled}
        style={{
          ...styles.submitBtn,
          opacity: !validation.valid || disabled ? 0.3 : 1,
          cursor: !validation.valid || disabled ? "not-allowed" : "pointer",
        }}
      >
        {disabled ? "BUILDING..." : "BUILD PIPE"}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "12px",
  },
  header: {
    color: "#0ff",
    fontSize: "11px",
    letterSpacing: "2px",
    textAlign: "center",
    paddingBottom: "8px",
    borderBottom: "1px solid rgba(0,255,255,0.2)",
  },
  section: {
    padding: "8px",
    border: "1px solid rgba(0,150,200,0.15)",
    borderRadius: "6px",
    background: "rgba(0,30,50,0.2)",
  },
  sectionTitle: {
    color: "rgba(0,255,255,0.6)",
    fontSize: "9px",
    letterSpacing: "2px",
    marginBottom: "8px",
  },
  fieldRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "6px",
  },
  label: {
    color: "rgba(0,200,200,0.7)",
    fontSize: "10px",
    minWidth: "80px",
  },
  input: {
    width: "70px",
    padding: "5px 8px",
    background: "rgba(0,30,50,0.8)",
    border: "1px solid rgba(0,255,255,0.2)",
    color: "#e0e0e0",
    borderRadius: "4px",
    fontFamily: "'Courier New', monospace",
    fontSize: "11px",
    outline: "none",
  },
  unit: {
    color: "rgba(0,200,200,0.4)",
    fontSize: "10px",
  },
  lengthInfo: {
    display: "flex",
    justifyContent: "space-between",
    color: "rgba(0,200,200,0.5)",
    fontSize: "9px",
    marginTop: "4px",
    paddingTop: "4px",
    borderTop: "1px solid rgba(0,255,255,0.1)",
  },
  segmentList: {
    maxHeight: "200px",
    overflowY: "auto",
    marginBottom: "6px",
  },
  addBtn: {
    width: "100%",
    padding: "6px",
    background: "rgba(0,60,80,0.3)",
    border: "1px dashed rgba(0,255,255,0.3)",
    color: "rgba(0,255,255,0.6)",
    fontSize: "9px",
    fontFamily: "'Courier New', monospace",
    cursor: "pointer",
    borderRadius: "4px",
    letterSpacing: "1px",
  },
  errors: {
    padding: "6px",
    borderRadius: "4px",
    background: "rgba(100,0,0,0.2)",
    border: "1px solid rgba(255,0,0,0.3)",
  },
  error: {
    color: "#f66",
    fontSize: "9px",
    marginBottom: "2px",
  },
  warnings: {
    padding: "6px",
    borderRadius: "4px",
    background: "rgba(100,80,0,0.2)",
    border: "1px solid rgba(255,200,0,0.3)",
  },
  warning: {
    color: "#fa0",
    fontSize: "9px",
    marginBottom: "2px",
  },
  submitBtn: {
    padding: "10px",
    background: "rgba(0,150,100,0.3)",
    border: "1px solid rgba(0,255,200,0.4)",
    color: "#0fd",
    fontSize: "11px",
    fontFamily: "'Courier New', monospace",
    letterSpacing: "3px",
    borderRadius: "6px",
    textAlign: "center",
  },
};
