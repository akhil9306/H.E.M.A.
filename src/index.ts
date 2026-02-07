import { serve } from "bun";
import index from "./index.html";
import { GeminiSession } from "./api/gemini";
import { OrchestratorSession } from "./api/orchestrator";

const sessions = new Map<string, GeminiSession>();
const orchestratorSessions = new Map<string, OrchestratorSession>();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

if (!GEMINI_API_KEY) {
  console.warn(
    "⚠️  GEMINI_API_KEY not set. Chat features will not work. Set it with: GEMINI_API_KEY=your-key bun dev"
  );
}

const server = serve({
  routes: {
    "/*": index,

    "/api/chat": {
      async POST(req) {
        try {
          const body = await req.json();
          const { message, sessionId, toolResults } = body;

          if (!GEMINI_API_KEY) {
            return Response.json(
              { type: "error", error: "GEMINI_API_KEY not configured on server" },
              { status: 500 }
            );
          }

          if (!sessionId) {
            return Response.json(
              { type: "error", error: "sessionId required" },
              { status: 400 }
            );
          }

          let session = sessions.get(sessionId);
          if (!session) {
            session = new GeminiSession(GEMINI_API_KEY);
            sessions.set(sessionId, session);
          }

          let result;
          if (toolResults) {
            result = await session.submitToolResults(toolResults);
          } else if (message) {
            result = await session.sendMessage(message);
          } else {
            return Response.json(
              { type: "error", error: "message or toolResults required" },
              { status: 400 }
            );
          }

          return Response.json(result);
        } catch (err: any) {
          console.error("Chat error:", err);
          return Response.json(
            { type: "error", error: err.message },
            { status: 500 }
          );
        }
      },
    },

    "/api/chat/reset": {
      async POST(req) {
        try {
          const { sessionId } = await req.json();
          if (sessionId) {
            const session = sessions.get(sessionId);
            if (session) {
              session.reset();
              sessions.delete(sessionId);
            }
          }
          return Response.json({ ok: true });
        } catch {
          return Response.json({ ok: true });
        }
      },
    },

    "/api/orchestrator": {
      async POST(req) {
        try {
          const body = await req.json();
          const { message, sessionId, toolResults } = body;

          if (!GEMINI_API_KEY) {
            return Response.json(
              { type: "error", error: "GEMINI_API_KEY not configured on server" },
              { status: 500 }
            );
          }

          if (!sessionId) {
            return Response.json(
              { type: "error", error: "sessionId required" },
              { status: 400 }
            );
          }

          let session = orchestratorSessions.get(sessionId);
          if (!session) {
            session = new OrchestratorSession(GEMINI_API_KEY);
            orchestratorSessions.set(sessionId, session);
          }

          let result;
          if (toolResults) {
            result = await session.submitToolResults(toolResults);
          } else if (message) {
            result = await session.sendMessage(message);
          } else {
            return Response.json(
              { type: "error", error: "message or toolResults required" },
              { status: 400 }
            );
          }

          return Response.json(result);
        } catch (err: any) {
          console.error("Orchestrator error:", err);
          return Response.json(
            { type: "error", error: err.message },
            { status: 500 }
          );
        }
      },
    },

    "/api/orchestrator/reset": {
      async POST(req) {
        try {
          const { sessionId } = await req.json();
          if (sessionId) {
            const session = orchestratorSessions.get(sessionId);
            if (session) {
              session.reset();
              orchestratorSessions.delete(sessionId);
            }
          }
          return Response.json({ ok: true });
        } catch {
          return Response.json({ ok: true });
        }
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 H.E.M.A. Server running at ${server.url}`);
