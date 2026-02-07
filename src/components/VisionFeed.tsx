import { useEffect, useRef, useState } from "react";
import { useRobot } from "@/context/RobotContext";

export function VisionFeed() {
  const robot = useRobot();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [info, setInfo] = useState({ objects: 0, distance: "-- m" });

  useEffect(() => {
    let rafId: number;
    let lastUpdate = 0;

    function update() {
      rafId = requestAnimationFrame(update);
      const now = performance.now();
      if (now - lastUpdate < 100) return; // ~10fps
      lastUpdate = now;

      const vr = robot.getVisionRenderer();
      const canvas = canvasRef.current;
      if (!vr || !canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(vr.domElement, 0, 0, 320, 240);

      // Scanline overlay
      ctx.fillStyle = "rgba(0,255,0,0.02)";
      for (let y = 0; y < 240; y += 3) {
        ctx.fillRect(0, y, 320, 1);
      }

      // Update detection info
      const vi = robot.getVisionInfo();
      setInfo({
        objects: vi.objectsInView,
        distance:
          vi.closestDistance < Infinity
            ? vi.closestDistance.toFixed(2) + " m"
            : "-- m",
      });
    }

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [robot]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>ROBOT VISION FEED</div>
      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        style={styles.canvas}
      />
      <div style={styles.info}>
        <div style={styles.infoRow}>
          <span>Objects:</span>
          <span style={styles.value}>{info.objects}</span>
        </div>
        <div style={styles.infoRow}>
          <span>Distance:</span>
          <span style={styles.value}>{info.distance}</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: "rgba(0,0,0,0.95)",
    border: "1px solid rgba(0,255,0,0.4)",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 0 15px rgba(0,255,0,0.15)",
  },
  header: {
    padding: "8px",
    background: "rgba(0,50,0,0.6)",
    color: "#0f0",
    textAlign: "center",
    fontSize: "10px",
    letterSpacing: "3px",
    fontFamily: "'Courier New', monospace",
    borderBottom: "1px solid rgba(0,255,0,0.3)",
  },
  canvas: {
    display: "block",
    width: "100%",
    height: "auto",
  },
  info: {
    padding: "8px 12px",
    borderTop: "1px solid rgba(0,255,0,0.2)",
    fontFamily: "'Courier New', monospace",
    fontSize: "10px",
    color: "rgba(0,255,0,0.6)",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "2px 0",
  },
  value: {
    color: "#0f0",
    textShadow: "0 0 5px rgba(0,255,0,0.5)",
  },
};
