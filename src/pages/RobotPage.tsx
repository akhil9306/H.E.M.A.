import { useEffect, useRef, useState } from "react";
import { useRobot } from "@/context/RobotContext";
import { VisionFeed } from "@/components/VisionFeed";
import { ChatPanel } from "@/components/ChatPanel";
import { ModeToggle, type Mode } from "@/components/ModeToggle";
import { OrchestratorView } from "@/pages/OrchestratorView";
import type { JointName } from "@/robot/types";

const SLIDER_CONFIG: {
  id: JointName;
  label: string;
  min: number;
  max: number;
  group: string;
}[] = [
  { id: "headPan", label: "Head Pan", min: -90, max: 90, group: "Head" },
  { id: "headTilt", label: "Head Tilt", min: -60, max: 60, group: "Head" },
  { id: "leftShoulder", label: "L Shoulder", min: -180, max: 180, group: "Arms" },
  { id: "leftElbow", label: "L Elbow", min: 0, max: 150, group: "Arms" },
  { id: "leftFingers", label: "L Fingers", min: 0, max: 90, group: "Arms" },
  { id: "rightShoulder", label: "R Shoulder", min: -180, max: 180, group: "Arms" },
  { id: "rightElbow", label: "R Elbow", min: 0, max: 150, group: "Arms" },
  { id: "rightFingers", label: "R Fingers", min: 0, max: 90, group: "Arms" },
  { id: "leftHip", label: "L Hip", min: -120, max: 120, group: "Legs" },
  { id: "leftKnee", label: "L Knee", min: 0, max: 150, group: "Legs" },
  { id: "rightHip", label: "R Hip", min: -120, max: 120, group: "Legs" },
  { id: "rightKnee", label: "R Knee", min: 0, max: 150, group: "Legs" },
];

interface RobotPageProps {
  initialMode?: Mode;
}

export function RobotPage({ initialMode = "chat" }: RobotPageProps) {
  const robot = useRobot();
  const containerRef = useRef<HTMLDivElement>(null);
  const visionCanvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [jointValues, setJointValues] = useState<Record<JointName, number>>(
    () => {
      const vals: any = {};
      SLIDER_CONFIG.forEach((s) => (vals[s.id] = 0));
      return vals;
    }
  );
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (mode !== "chat") return;
    if (containerRef.current && visionCanvasRef.current) {
      robot.initialize(containerRef.current, visionCanvasRef.current);

      robot.setOnStateChange(() => {
        const state = robot.getState();
        setJointValues({ ...state.joints });
      });
    }
    return () => robot.dispose();
  }, [robot, mode]);

  const handleSlider = (joint: JointName, value: number) => {
    robot.moveJoint(joint, value);
    setJointValues((prev) => ({ ...prev, [joint]: value }));
  };

  const handleModeChange = (newMode: Mode) => {
    if (newMode === mode) return;
    // Dispose current mode's resources before switching
    if (mode === "chat") {
      robot.dispose();
    }
    setMode(newMode);
  };

  const groups = ["Head", "Arms", "Legs"];

  return (
    <div style={styles.page}>
      {/* Mode Toggle - always visible on top */}
      <ModeToggle mode={mode} onChange={handleModeChange} />

      {mode === "chat" ? (
        <>
          {/* 3D Scene */}
          <div style={styles.sceneArea}>
            <div ref={containerRef} style={styles.sceneContainer} />
            <canvas
              ref={visionCanvasRef}
              width={320}
              height={240}
              style={{ display: "none" }}
            />

            {/* Toggle controls button */}
            <button
              onClick={() => setShowControls(!showControls)}
              style={styles.toggleBtn}
            >
              {showControls ? "HIDE CONTROLS" : "MANUAL CONTROLS"}
            </button>

            {/* Status badge */}
            <div style={styles.statusBadge}>
              <span style={styles.statusDot} />
              OPERATIONAL
            </div>

            {/* Manual controls overlay */}
            {showControls && (
              <div style={styles.controlsPanel}>
                <div style={styles.controlsHeader}>MANUAL JOINT CONTROL</div>
                {groups.map((group) => (
                  <div key={group} style={styles.controlGroup}>
                    <div style={styles.groupTitle}>{group}</div>
                    {SLIDER_CONFIG.filter((s) => s.group === group).map((s) => (
                      <div key={s.id} style={styles.sliderRow}>
                        <label style={styles.sliderLabel}>
                          {s.label}: {jointValues[s.id]?.toFixed(1)}
                        </label>
                        <input
                          type="range"
                          min={s.min}
                          max={s.max}
                          step={1}
                          value={jointValues[s.id] || 0}
                          onChange={(e) =>
                            handleSlider(s.id, parseFloat(e.target.value))
                          }
                          style={styles.slider}
                        />
                      </div>
                    ))}
                  </div>
                ))}

                {/* Quick actions */}
                <div style={styles.controlGroup}>
                  <div style={styles.groupTitle}>Quick Actions</div>
                  <div style={styles.buttonRow}>
                    {(["reset", "wave", "greet", "point", "walk", "stopWalk", "lookAtTable"] as const).map(
                      (action) => (
                        <button
                          key={action}
                          onClick={() => robot.executeAction(action)}
                          style={styles.actionBtn}
                        >
                          {action}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div style={styles.sidebar}>
            <VisionFeed />
            <ChatPanel />
          </div>
        </>
      ) : (
        <OrchestratorView />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    width: "100vw",
    height: "100vh",
    background: "#0a0a0f",
    fontFamily: "'Courier New', monospace",
    overflow: "hidden",
    position: "relative",
  },
  sceneArea: {
    flex: "1 1 70%",
    position: "relative",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },
  sceneContainer: {
    width: "100%",
    height: "100%",
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  sidebar: {
    width: "360px",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    background: "rgba(0,10,20,0.95)",
    borderLeft: "1px solid rgba(0,255,255,0.15)",
    overflow: "hidden",
  },
  toggleBtn: {
    position: "absolute",
    top: "12px",
    left: "12px",
    padding: "8px 16px",
    background: "rgba(0,20,40,0.9)",
    border: "1px solid rgba(0,255,255,0.4)",
    color: "#0ff",
    fontSize: "10px",
    fontFamily: "'Courier New', monospace",
    letterSpacing: "2px",
    cursor: "pointer",
    borderRadius: "4px",
    zIndex: 10,
  },
  statusBadge: {
    position: "absolute",
    top: "50px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "6px 16px",
    background: "rgba(0,50,0,0.8)",
    border: "1px solid rgba(0,255,0,0.4)",
    color: "#0f0",
    fontSize: "10px",
    fontFamily: "'Courier New', monospace",
    letterSpacing: "2px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    zIndex: 10,
  },
  statusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#0f0",
    boxShadow: "0 0 6px #0f0",
    display: "inline-block",
  },
  controlsPanel: {
    position: "absolute",
    top: "50px",
    left: "12px",
    width: "280px",
    maxHeight: "calc(100vh - 70px)",
    overflowY: "auto",
    background: "rgba(0,20,40,0.95)",
    border: "1px solid rgba(0,255,255,0.3)",
    borderRadius: "8px",
    padding: "12px",
    zIndex: 10,
    boxShadow: "0 0 20px rgba(0,255,255,0.1)",
  },
  controlsHeader: {
    color: "#0ff",
    fontSize: "11px",
    letterSpacing: "2px",
    textAlign: "center",
    paddingBottom: "8px",
    borderBottom: "1px solid rgba(0,255,255,0.2)",
    marginBottom: "10px",
  },
  controlGroup: {
    marginBottom: "12px",
    padding: "8px",
    border: "1px solid rgba(0,150,200,0.2)",
    borderRadius: "6px",
    background: "rgba(0,30,50,0.3)",
  },
  groupTitle: {
    color: "#0ff",
    fontSize: "10px",
    letterSpacing: "2px",
    textTransform: "uppercase",
    marginBottom: "8px",
    borderBottom: "1px solid rgba(0,255,255,0.15)",
    paddingBottom: "4px",
  },
  sliderRow: {
    marginBottom: "6px",
  },
  sliderLabel: {
    display: "block",
    color: "rgba(0,200,200,0.7)",
    fontSize: "10px",
    marginBottom: "2px",
  },
  slider: {
    width: "100%",
    height: "3px",
    accentColor: "#0ff",
  },
  buttonRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px",
  },
  actionBtn: {
    padding: "5px 10px",
    background: "rgba(0,100,150,0.3)",
    border: "1px solid rgba(0,255,255,0.3)",
    color: "#0ff",
    fontSize: "9px",
    fontFamily: "'Courier New', monospace",
    cursor: "pointer",
    borderRadius: "3px",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
};
