import type { PipeSegment } from "@/factory/types";
import { CONSTRAINTS } from "@/factory/types";

interface SegmentEditorProps {
  index: number;
  segment: PipeSegment;
  runningDiameter: number;
  onChange: (index: number, segment: PipeSegment) => void;
  onDelete: (index: number) => void;
}

export function SegmentEditor({
  index,
  segment,
  runningDiameter,
  onChange,
  onDelete,
}: SegmentEditorProps) {
  const isCylinder = segment.type === "cylinder";

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.label}>Segment {index + 1}</span>
        <div style={styles.typeToggle}>
          <button
            style={{
              ...styles.typeBtn,
              ...(isCylinder ? styles.typeBtnActive : {}),
            }}
            onClick={() =>
              onChange(index, {
                type: "cylinder",
                height: segment.height || CONSTRAINTS.minSegmentHeight,
                diameter: runningDiameter,
              })
            }
          >
            CYL
          </button>
          <button
            style={{
              ...styles.typeBtn,
              ...(!isCylinder ? styles.typeBtnActive : {}),
            }}
            onClick={() =>
              onChange(index, {
                type: "frustrum",
                height: segment.height || CONSTRAINTS.frustrumHeightMin,
                topDiameter: runningDiameter,
                bottomDiameter: segment.bottomDiameter || runningDiameter,
              })
            }
          >
            FRS
          </button>
        </div>
        <button style={styles.deleteBtn} onClick={() => onDelete(index)}>
          X
        </button>
      </div>

      <div style={styles.fields}>
        {isCylinder ? (
          <>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>
                Dia: {runningDiameter.toFixed(1)}m
              </span>
            </div>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>Height:</span>
              <input
                type="number"
                step="0.1"
                min={CONSTRAINTS.minSegmentHeight}
                max={CONSTRAINTS.rollerHeightMax}
                value={segment.height}
                onChange={(e) =>
                  onChange(index, {
                    ...segment,
                    height: parseFloat(e.target.value) || CONSTRAINTS.minSegmentHeight,
                  })
                }
                style={styles.input}
              />
              <span style={styles.unit}>m</span>
            </div>
          </>
        ) : (
          <>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>From: {runningDiameter.toFixed(1)}m</span>
            </div>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>To Dia:</span>
              <input
                type="number"
                step="0.1"
                min={CONSTRAINTS.rollerDiameterMin}
                max={CONSTRAINTS.rollerDiameterMax}
                value={segment.bottomDiameter || runningDiameter}
                onChange={(e) =>
                  onChange(index, {
                    ...segment,
                    bottomDiameter: parseFloat(e.target.value) || runningDiameter,
                    topDiameter: runningDiameter,
                  })
                }
                style={styles.input}
              />
              <span style={styles.unit}>m</span>
            </div>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>Height:</span>
              <input
                type="number"
                step="0.1"
                min={CONSTRAINTS.frustrumHeightMin}
                max={CONSTRAINTS.frustrumHeightMax}
                value={segment.height}
                onChange={(e) =>
                  onChange(index, {
                    ...segment,
                    height: parseFloat(e.target.value) || CONSTRAINTS.frustrumHeightMin,
                  })
                }
                style={styles.input}
              />
              <span style={styles.unit}>m</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: "rgba(0,30,50,0.4)",
    border: "1px solid rgba(0,150,200,0.2)",
    borderRadius: "6px",
    padding: "8px",
    marginBottom: "6px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "6px",
  },
  label: {
    color: "rgba(0,200,200,0.8)",
    fontSize: "10px",
    letterSpacing: "1px",
    flex: 1,
  },
  typeToggle: {
    display: "flex",
    gap: "0px",
    borderRadius: "3px",
    overflow: "hidden",
    border: "1px solid rgba(0,255,255,0.2)",
  },
  typeBtn: {
    padding: "3px 8px",
    background: "rgba(0,20,40,0.8)",
    border: "none",
    color: "rgba(0,255,255,0.4)",
    fontSize: "9px",
    fontFamily: "'Courier New', monospace",
    cursor: "pointer",
  },
  typeBtnActive: {
    background: "rgba(0,80,120,0.7)",
    color: "#0ff",
  },
  deleteBtn: {
    padding: "2px 6px",
    background: "rgba(100,0,0,0.4)",
    border: "1px solid rgba(255,0,0,0.3)",
    color: "#f66",
    fontSize: "9px",
    fontFamily: "'Courier New', monospace",
    cursor: "pointer",
    borderRadius: "3px",
  },
  fields: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  fieldRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  fieldLabel: {
    color: "rgba(0,200,200,0.6)",
    fontSize: "10px",
    minWidth: "55px",
  },
  input: {
    width: "60px",
    padding: "3px 6px",
    background: "rgba(0,30,50,0.8)",
    border: "1px solid rgba(0,255,255,0.2)",
    color: "#e0e0e0",
    borderRadius: "3px",
    fontFamily: "'Courier New', monospace",
    fontSize: "10px",
    outline: "none",
  },
  unit: {
    color: "rgba(0,200,200,0.4)",
    fontSize: "9px",
  },
};
