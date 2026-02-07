import { useCallback } from "react";

interface Props {
  onStart: () => void;
}

export function HomePage({ onStart }: Props) {
  const handleStart = useCallback(() => onStart(), [onStart]);

  return (
    <div style={styles.container}>
      <div style={styles.grid} />
      <div style={styles.content}>
        <div style={styles.badge}>ADVANCED ROBOTICS SYSTEM</div>
        <h1 style={styles.title}>H.E.M.A.</h1>
        <div style={styles.subtitle}>
          Humanoid Embodiment of Multimodal AI
        </div>
        <p style={styles.description}>
          An intelligent humanoid robot powered by Gemini AI. Control a
          32-DOF articulated robot through natural language. The AI sees
          through the robot's eyes and executes complex motor tasks
          autonomously.
        </p>
        <div style={styles.features}>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>&#9678;</span>
            <span>Vision System</span>
          </div>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>&#9678;</span>
            <span>LLM Tool Calls</span>
          </div>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>&#9678;</span>
            <span>32 Articulated Joints</span>
          </div>
        </div>
        <button onClick={handleStart} style={styles.button}>
          GET STARTED
        </button>
        <div style={styles.version}>v1.0 // OPERATIONAL</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100vw",
    height: "100vh",
    background: "linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0a1a 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Courier New', monospace",
  },
  grid: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px)",
    backgroundSize: "50px 50px",
  },
  content: {
    textAlign: "center" as const,
    zIndex: 1,
    padding: "40px",
  },
  badge: {
    display: "inline-block",
    padding: "6px 20px",
    border: "1px solid rgba(0,255,255,0.3)",
    borderRadius: "20px",
    color: "rgba(0,255,255,0.7)",
    fontSize: "11px",
    letterSpacing: "3px",
    marginBottom: "30px",
  },
  title: {
    fontSize: "clamp(60px, 10vw, 120px)",
    fontWeight: "bold",
    color: "#fff",
    margin: "0 0 10px 0",
    letterSpacing: "15px",
    textShadow: "0 0 40px rgba(0,255,255,0.4), 0 0 80px rgba(0,255,255,0.2)",
    lineHeight: 1,
  },
  subtitle: {
    fontSize: "clamp(14px, 2vw, 18px)",
    color: "rgba(0,255,255,0.8)",
    letterSpacing: "6px",
    marginBottom: "30px",
    textTransform: "uppercase" as const,
  },
  description: {
    maxWidth: "600px",
    margin: "0 auto 40px",
    color: "rgba(255,255,255,0.5)",
    fontSize: "14px",
    lineHeight: "1.8",
  },
  features: {
    display: "flex",
    justifyContent: "center",
    gap: "30px",
    marginBottom: "50px",
    flexWrap: "wrap" as const,
  },
  feature: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "rgba(0,255,255,0.6)",
    fontSize: "12px",
    letterSpacing: "1px",
  },
  featureIcon: {
    color: "#0ff",
    fontSize: "8px",
  },
  button: {
    padding: "16px 50px",
    background: "transparent",
    border: "2px solid #0ff",
    color: "#0ff",
    fontSize: "14px",
    fontFamily: "'Courier New', monospace",
    letterSpacing: "4px",
    cursor: "pointer",
    borderRadius: "4px",
    transition: "all 0.3s",
    textTransform: "uppercase" as const,
    boxShadow: "0 0 20px rgba(0,255,255,0.2)",
  },
  version: {
    marginTop: "40px",
    color: "rgba(255,255,255,0.2)",
    fontSize: "11px",
    letterSpacing: "2px",
  },
};
