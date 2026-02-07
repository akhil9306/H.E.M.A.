import { useState, useRef, useEffect, useCallback } from "react";
import { useRobot } from "@/context/RobotContext";
import { ChatMessage, type ChatMsg } from "./ChatMessage";
import type { JointName, ActionName, GraspableObject } from "@/robot/types";

interface ToolCall {
  name: string;
  args: Record<string, any>;
}

interface ApiResponse {
  type: "text" | "tool_calls" | "error";
  text?: string;
  calls?: ToolCall[];
  error?: string;
}

export function ChatPanel() {
  const robot = useRobot();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "system",
      content:
        "H.E.M.A. AI Interface Online. Ask me to perform actions like walking, picking up objects, or looking around.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const addMsg = useCallback((msg: ChatMsg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const executeToolCalls = useCallback(
    async (calls: ToolCall[]) => {
      const results: { name: string; response: string; imageData?: string }[] = [];

      for (const call of calls) {
        let result = "";
        let imageData: string | undefined;

        switch (call.name) {
          case "moveJoint":
            robot.moveJoint(call.args.joint as JointName, call.args.angle);
            result = `Moved ${call.args.joint} to ${call.args.angle} degrees`;
            break;

          case "executeAction":
            result = await robot.executeAction(call.args.action as ActionName);
            break;

          case "graspObject":
            result = await robot.graspObject(
              call.args.objectName as GraspableObject
            );
            break;

          case "releaseObject":
            result = await robot.releaseObject();
            break;

          case "getRobotVision": {
            const dataUrl = robot.captureVision();
            imageData = dataUrl;
            result = "Vision captured successfully";
            break;
          }

          case "getRobotState":
            result = JSON.stringify(robot.getState(), null, 2);
            break;

          case "lookAt":
            result = await robot.lookAt(call.args.target);
            break;

          default:
            result = `Unknown tool: ${call.name}`;
        }

        results.push({ name: call.name, response: result, imageData });
      }

      return results;
    },
    [robot]
  );

  const handleResponse = useCallback(
    async (data: ApiResponse): Promise<void> => {
      if (data.type === "error") {
        addMsg({ role: "system", content: `Error: ${data.error}` });
        setLoading(false);
        return;
      }

      if (data.type === "text") {
        addMsg({ role: "assistant", content: data.text || "" });
        setLoading(false);
        return;
      }

      if (data.type === "tool_calls" && data.calls) {
        // Show tool activity
        for (const call of data.calls) {
          addMsg({
            role: "system",
            content: `Executing: ${call.name}(${JSON.stringify(call.args)})`,
          });
        }

        const results = await executeToolCalls(data.calls);

        // Send results back
        try {
          const resp = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, toolResults: results }),
          });
          const nextData: ApiResponse = await resp.json();
          await handleResponse(nextData);
        } catch (err: any) {
          addMsg({
            role: "system",
            content: `Error sending tool results: ${err.message}`,
          });
          setLoading(false);
        }
      }
    },
    [addMsg, executeToolCalls, sessionId]
  );

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    addMsg({ role: "user", content: text });
    setLoading(true);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId }),
      });
      const data: ApiResponse = await resp.json();
      await handleResponse(data);
    } catch (err: any) {
      addMsg({ role: "system", content: `Error: ${err.message}` });
      setLoading(false);
    }
  }, [input, loading, addMsg, sessionId, handleResponse]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>AI CONTROL INTERFACE</div>
      <div ref={listRef} style={styles.messageList}>
        {messages.map((m, i) => (
          <ChatMessage key={i} msg={m} />
        ))}
        {loading && (
          <div style={styles.loading}>Processing...</div>
        )}
      </div>
      <div style={styles.inputArea}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Command the robot..."
          disabled={loading}
          style={styles.input}
          rows={1}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            ...styles.sendBtn,
            opacity: loading || !input.trim() ? 0.4 : 1,
          }}
        >
          {loading ? "..." : "SEND"}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "rgba(0,10,20,0.95)",
    borderLeft: "1px solid rgba(0,255,255,0.2)",
    fontFamily: "'Courier New', monospace",
  },
  header: {
    padding: "12px 16px",
    background: "rgba(0,20,40,0.9)",
    color: "#0ff",
    fontSize: "12px",
    letterSpacing: "3px",
    textAlign: "center",
    borderBottom: "1px solid rgba(0,255,255,0.3)",
    flexShrink: 0,
  },
  messageList: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  loading: {
    alignSelf: "center",
    color: "rgba(0,255,255,0.5)",
    fontSize: "11px",
    fontStyle: "italic",
    padding: "8px",
  },
  inputArea: {
    padding: "10px",
    borderTop: "1px solid rgba(0,255,255,0.2)",
    display: "flex",
    gap: "8px",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: "rgba(0,30,50,0.8)",
    border: "1px solid rgba(0,255,255,0.2)",
    color: "#e0e0e0",
    padding: "10px 12px",
    borderRadius: "6px",
    fontFamily: "'Courier New', monospace",
    fontSize: "12px",
    resize: "none",
    outline: "none",
  },
  sendBtn: {
    padding: "10px 18px",
    background: "rgba(0,150,200,0.3)",
    border: "1px solid rgba(0,255,255,0.4)",
    color: "#0ff",
    borderRadius: "6px",
    cursor: "pointer",
    fontFamily: "'Courier New', monospace",
    fontSize: "11px",
    letterSpacing: "2px",
    flexShrink: 0,
  },
};
