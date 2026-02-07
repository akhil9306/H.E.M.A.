export interface ChatMsg {
  role: "user" | "assistant" | "system";
  content: string;
}

export function ChatMessage({ msg }: { msg: ChatMsg }) {
  const s = roleStyles[msg.role];
  return (
    <div style={{ ...baseStyle, ...s }}>
      <div
        dangerouslySetInnerHTML={{
          __html: msg.content
            .replace(/\n/g, "<br>")
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
        }}
      />
    </div>
  );
}

const baseStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "10px",
  lineHeight: 1.5,
  fontSize: "13px",
  maxWidth: "85%",
  wordWrap: "break-word",
};

const roleStyles: Record<string, React.CSSProperties> = {
  user: {
    alignSelf: "flex-end",
    background: "rgba(0,100,150,0.4)",
    color: "#e0e0e0",
    borderBottomRightRadius: "2px",
  },
  assistant: {
    alignSelf: "flex-start",
    background: "rgba(0,40,60,0.6)",
    color: "#d0d0d0",
    borderBottomLeftRadius: "2px",
    border: "1px solid rgba(0,255,255,0.1)",
  },
  system: {
    alignSelf: "center",
    background: "rgba(0,255,255,0.05)",
    color: "rgba(0,255,255,0.6)",
    border: "1px solid rgba(0,255,255,0.15)",
    fontSize: "11px",
    fontStyle: "italic",
    textAlign: "center",
    maxWidth: "100%",
  },
};
