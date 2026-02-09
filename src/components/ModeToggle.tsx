import { useNavigate } from "react-router-dom";

export type Mode = "chat" | "orchestrator";

interface ModeToggleProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  const navigate = useNavigate();

  const handleChange = (newMode: Mode) => {
    onChange(newMode);
    navigate(newMode === "chat" ? "/chat" : "/orchestrate");
  };

  return (
    <div style={styles.container}>
      <button
        onClick={() => handleChange("chat")}
        style={{
          ...styles.btn,
          ...(mode === "chat" ? styles.active : {}),
        }}
      >
        CHAT
      </button>
      <button
        onClick={() => handleChange("orchestrator")}
        style={{
          ...styles.btn,
          ...(mode === "orchestrator" ? styles.active : {}),
        }}
      >
        ORCHESTRATOR
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "absolute",
    top: "12px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "0px",
    zIndex: 20,
    borderRadius: "6px",
    overflow: "hidden",
    border: "1px solid rgba(0,255,255,0.3)",
  },
  btn: {
    padding: "8px 20px",
    background: "rgba(0,20,40,0.9)",
    border: "none",
    color: "rgba(0,255,255,0.5)",
    fontSize: "10px",
    fontFamily: "'Courier New', monospace",
    letterSpacing: "2px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  active: {
    background: "rgba(0,80,120,0.8)",
    color: "#0ff",
    boxShadow: "0 0 12px rgba(0,255,255,0.2) inset",
  },
};
