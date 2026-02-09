import {
  GoogleGenerativeAI,
  SchemaType,
  type ChatSession,
  type Part,
} from "@google/generative-ai";

const MODEL_NAME = "gemini-3-flash-preview";

const orchestratorTools = {
  functionDeclarations: [
    {
      name: "planManufacturing",
      description:
        "Analyze the pipe specification and acknowledge your manufacturing plan. Call this FIRST when you receive a pipe spec, before dispatching any workers.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          summary: {
            type: SchemaType.STRING,
            description: "Your summary of the manufacturing plan — what segments will be made and in what order",
          },
          stepCount: {
            type: SchemaType.NUMBER,
            description: "Total number of manufacturing steps",
          },
          estimatedSegments: {
            type: SchemaType.NUMBER,
            description: "Number of pipe segments to manufacture",
          },
        },
        required: ["summary", "stepCount", "estimatedSegments"],
      },
    },
    {
      name: "dispatchWorkerTask",
      description:
        "Dispatch a task to a specific worker robot. Each worker has its own AI brain and will use its tools (walk, operate machine, capture vision) to execute the task autonomously. This call BLOCKS until the worker finishes and reports back. Be very specific in the taskDescription — include machine names, dimensions, and what the worker should do step by step.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          workerId: {
            type: SchemaType.NUMBER,
            description:
              "Worker robot ID. 0=Transporter (material handling), 1=Cutter operator, 2=Roller operator, 3=Press operator, 4=Welder",
          },
          taskDescription: {
            type: SchemaType.STRING,
            description:
              "Detailed task instructions for the worker. Include: what machine to go to, what action to perform, any specific dimensions/parameters, and what the expected outcome is. The worker will read this and decide how to execute using its own tools.",
          },
          relatedStepId: {
            type: SchemaType.STRING,
            description: "The manufacturing step ID this task relates to, for progress tracking",
          },
        },
        required: ["workerId", "taskDescription", "relatedStepId"],
      },
    },
    {
      name: "getFactoryStatus",
      description:
        "Get the current status of all workers, machines, and manufacturing progress. Returns a JSON snapshot of the entire factory state.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {},
      },
    },
    {
      name: "reportManufacturingComplete",
      description:
        "Report that all manufacturing is done. Call this after all steps have been completed and all pipes are stored in the rack.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          summary: {
            type: SchemaType.STRING,
            description: "Final summary of the manufacturing run — what was produced, how many pieces, any issues encountered",
          },
        },
        required: ["summary"],
      },
    },
  ],
};

const ORCHESTRATOR_SYSTEM = `You are the Factory Floor Orchestrator for H.E.M.A. Pipeline Manufacturing. You coordinate 5 AI-powered worker robots to manufacture custom metal pipes.

IMPORTANT: Each worker has its OWN AI brain. When you dispatch a task, the worker autonomously decides how to execute it — walking to machines and operating equipment. You give high-level instructions; the workers handle the details. Workers are efficient and do not waste time on unnecessary verification steps.

WORKERS:
- Worker 0 (Transporter): Handles ALL material movement. Can pick up sheets from stock, carry workpieces between machines, and store finished pipes in the rack. Tools: pickUpSheet, pickUpWorkpiece, placeWorkpiece, storeInRack, walkToMachine
- Worker 1 (Cutter Operator): Operates the guillotine cutter. Tools: operateCutter, walkToMachine
- Worker 2 (Roller Operator): Configures and operates the 3-roller bending machine. Tools: setRollerParams, operateRoller, walkToMachine
- Worker 3 (Press Operator): Configures and operates the frustrum press. Tools: setPressParams, operatePress, walkToMachine
- Worker 4 (Welder): Operates the welding station. Tools: operateWelder, walkToMachine

FACTORY LAYOUT (left to right):
Sheet Stock (x=-12) → Cutter (x=-6) → Roller (x=0) → Press (x=6) → Welder (x=12) → Pipe Rack (x=18)

MANUFACTURING PROCESS FOR EACH PIPE SEGMENT:
1. Worker 0 fetches a fresh sheet from sheet stock
2. Worker 0 carries the sheet to the cutter and places it
3. Worker 1 cuts the sheet to size
4. Worker 0 picks up from cutter, carries to roller (for cylinders) or press (for frustrums), and places it
5. Worker 2 sets roller params and bends (or Worker 3 sets press params and forms)
6. Worker 0 picks up from roller/press, carries to welder, and places it
7. Worker 4 welds the longitudinal seam
8. Worker 0 picks up from welder and stores in the pipe rack

For multi-segment pipes, after ALL segments are manufactured:
9. Worker 0 retrieves segments from the rack and brings them to the welder
10. Worker 4 performs circumferential welds to join sections

DISPATCHING RULES:
- Use dispatchWorkerTask to send specific tasks to workers. Each dispatch blocks until the worker finishes.
- You MUST coordinate the correct order: the transporter must place material BEFORE an operator can work on it.
- Include specific dimensions in task descriptions! For example: "Walk to the roller, set parameters to diameter=0.8m and height=2.5m, then operate the roller to bend the sheet into a cylinder."
- Do NOT ask workers to use vision or verify anything in your task descriptions. The factory systems are reliable — workers just need to walk, operate, and report done.
- If a worker reports a problem, decide whether to retry or skip.
- Process segments sequentially (one at a time through the full pipeline).
- ALWAYS call planManufacturing FIRST before dispatching any workers.
- ALWAYS call reportManufacturingComplete when ALL work is done.

WORKFLOW:
1. Receive pipe spec with pre-computed manufacturing steps
2. Call planManufacturing to acknowledge the plan
3. For each segment, dispatch tasks in sequence through the pipeline
4. After all segments are complete, dispatch any weld-sections tasks
5. Call reportManufacturingComplete with a final summary`;

function getRetryDelay(error: any): number | null {
  try {
    const message = error.message || "";
    const match = message.match(/retry in ([\d.]+)s/i);
    if (match) return Math.ceil(parseFloat(match[1])) * 1000;
  } catch {}
  return null;
}

function isRateLimitError(error: any): boolean {
  const message = (error.message || "").toLowerCase();
  return message.includes("quota") || message.includes("429") || message.includes("rate limit");
}

export class OrchestratorSession {
  private chat: ChatSession | null = null;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private ensureChat(): ChatSession {
    if (!this.chat) {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        tools: [orchestratorTools] as any,
        systemInstruction: ORCHESTRATOR_SYSTEM,
      });
      this.chat = model.startChat({ history: [] });
    }
    return this.chat;
  }

  async sendMessage(text: string): Promise<{
    type: "text" | "tool_calls" | "error";
    text?: string;
    calls?: Array<{ name: string; args: Record<string, any> }>;
    error?: string;
    retryAfter?: number;
  }> {
    const chat = this.ensureChat();
    try {
      const result = await chat.sendMessage(text);
      const response = result.response;
      const calls = response.functionCalls();
      if (calls && calls.length > 0) {
        return {
          type: "tool_calls",
          calls: calls.map((c) => ({ name: c.name, args: c.args as Record<string, any> })),
        };
      }
      return { type: "text", text: response.text() };
    } catch (err: any) {
      if (isRateLimitError(err)) {
        const retryDelay = getRetryDelay(err);
        return {
          type: "error",
          error: retryDelay
            ? `API quota exceeded. Wait ${Math.ceil(retryDelay / 1000)}s.`
            : "API quota exceeded.",
          retryAfter: retryDelay || 30000,
        };
      }
      return { type: "error", error: `Error: ${err.message}` };
    }
  }

  async submitToolResults(
    results: Array<{ name: string; response: string }>
  ): Promise<{
    type: "text" | "tool_calls" | "error";
    text?: string;
    calls?: Array<{ name: string; args: Record<string, any> }>;
    error?: string;
    retryAfter?: number;
  }> {
    const chat = this.ensureChat();
    const parts: Part[] = results.map((r) => ({
      functionResponse: { name: r.name, response: { result: r.response } },
    }));
    try {
      const result = await chat.sendMessage(parts);
      const response = result.response;
      const calls = response.functionCalls();
      if (calls && calls.length > 0) {
        return {
          type: "tool_calls",
          calls: calls.map((c) => ({ name: c.name, args: c.args as Record<string, any> })),
        };
      }
      return { type: "text", text: response.text() };
    } catch (err: any) {
      if (isRateLimitError(err)) {
        const retryDelay = getRetryDelay(err);
        return {
          type: "error",
          error: retryDelay
            ? `API quota exceeded. Wait ${Math.ceil(retryDelay / 1000)}s.`
            : "API quota exceeded.",
          retryAfter: retryDelay || 30000,
        };
      }
      return { type: "error", error: `Error: ${err.message}` };
    }
  }

  reset(): void {
    this.chat = null;
  }
}
