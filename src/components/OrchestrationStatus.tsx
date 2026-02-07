import type { ManufacturingStep, WorkerState } from "@/factory/types";

interface OrchestrationStatusProps {
  steps: ManufacturingStep[];
  workers: WorkerState[];
  isRunning: boolean;
  messages: string[];
}

export function OrchestrationStatus({
  steps,
  workers,
  isRunning,
  messages,
}: OrchestrationStatusProps) {
  const completed = steps.filter((s) => s.status === "completed").length;
  const progress = steps.length > 0 ? (completed / steps.length) * 100 : 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>MANUFACTURING STATUS</div>

      {/* Progress bar */}
      <div style={styles.progressContainer}>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${progress}%`,
            }}
          />
        </div>
        <span style={styles.progressText}>
          {completed}/{steps.length} steps ({progress.toFixed(0)}%)
        </span>
      </div>

      {/* Workers */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>WORKERS</div>
        {workers.map((w) => (
          <div key={w.id} style={styles.workerRow}>
            <span style={styles.workerId}>R{w.id + 1}</span>
            <span
              style={{
                ...styles.workerStatus,
                color: statusColor(w.status),
              }}
            >
              {w.status.toUpperCase()}
            </span>
            {w.targetMachine && (
              <span style={styles.workerTarget}>@ {w.targetMachine}</span>
            )}
          </div>
        ))}
      </div>

      {/* Steps list */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>STEPS</div>
        <div style={styles.stepList}>
          {steps.map((step, i) => (
            <div key={step.id} style={styles.stepRow}>
              <span style={styles.stepIndicator}>
                {step.status === "completed" && (
                  <span style={{ color: "#0f0" }}>+</span>
                )}
                {step.status === "in_progress" && (
                  <span style={{ color: "#ff0", animation: "pulse 1s infinite" }}>*</span>
                )}
                {step.status === "pending" && (
                  <span style={{ color: "#555" }}>-</span>
                )}
                {step.status === "failed" && (
                  <span style={{ color: "#f00" }}>!</span>
                )}
              </span>
              <span
                style={{
                  ...styles.stepText,
                  color:
                    step.status === "completed"
                      ? "rgba(0,255,0,0.6)"
                      : step.status === "in_progress"
                      ? "#ff0"
                      : step.status === "failed"
                      ? "#f66"
                      : "rgba(200,200,200,0.4)",
                }}
              >
                {step.description}
              </span>
              {step.workerId !== undefined && (
                <span style={styles.stepWorker}>R{step.workerId + 1}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      {messages.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>ORCHESTRATOR LOG</div>
          <div style={styles.messageList}>
            {messages.map((msg, i) => (
              <div key={i} style={styles.message}>
                {msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {isRunning && (
        <div style={styles.runningBadge}>
          <span style={styles.runningDot} />
          MANUFACTURING IN PROGRESS
        </div>
      )}
    </div>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case "idle": return "rgba(0,255,255,0.5)";
    case "walking": return "#ff0";
    case "operating": return "#0f0";
    case "carrying": return "#fa0";
    default: return "#888";
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "12px",
    flex: 1,
    overflowY: "auto",
  },
  header: {
    color: "#0ff",
    fontSize: "11px",
    letterSpacing: "2px",
    textAlign: "center",
    paddingBottom: "8px",
    borderBottom: "1px solid rgba(0,255,255,0.2)",
  },
  progressContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  progressBar: {
    flex: 1,
    height: "6px",
    background: "rgba(0,30,50,0.8)",
    borderRadius: "3px",
    overflow: "hidden",
    border: "1px solid rgba(0,255,255,0.15)",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #0ff, #0f0)",
    borderRadius: "3px",
    transition: "width 0.3s",
  },
  progressText: {
    color: "rgba(0,200,200,0.6)",
    fontSize: "9px",
    whiteSpace: "nowrap",
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
    marginBottom: "6px",
  },
  workerRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
  },
  workerId: {
    color: "#0ff",
    fontSize: "10px",
    fontWeight: "bold",
  },
  workerStatus: {
    fontSize: "9px",
    letterSpacing: "1px",
  },
  workerTarget: {
    color: "rgba(0,200,200,0.4)",
    fontSize: "9px",
  },
  stepList: {
    maxHeight: "200px",
    overflowY: "auto",
  },
  stepRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "6px",
    marginBottom: "3px",
    padding: "2px 0",
  },
  stepIndicator: {
    fontSize: "10px",
    width: "12px",
    textAlign: "center",
    flexShrink: 0,
  },
  stepText: {
    fontSize: "9px",
    flex: 1,
    lineHeight: "1.3",
  },
  stepWorker: {
    color: "rgba(0,255,255,0.4)",
    fontSize: "8px",
    flexShrink: 0,
  },
  messageList: {
    maxHeight: "100px",
    overflowY: "auto",
  },
  message: {
    color: "rgba(0,200,200,0.5)",
    fontSize: "9px",
    marginBottom: "2px",
    borderLeft: "2px solid rgba(0,255,255,0.2)",
    paddingLeft: "6px",
  },
  runningBadge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "8px",
    background: "rgba(0,50,0,0.4)",
    border: "1px solid rgba(0,255,0,0.3)",
    borderRadius: "4px",
    color: "#0f0",
    fontSize: "9px",
    letterSpacing: "2px",
  },
  runningDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#0f0",
    boxShadow: "0 0 6px #0f0",
    display: "inline-block",
  },
};
