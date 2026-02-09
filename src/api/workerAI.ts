import {
  GoogleGenerativeAI,
  SchemaType,
  type ChatSession,
  type Part,
  type FunctionDeclaration,
} from "@google/generative-ai";

const MODEL_NAME = "gemini-3-flash-preview";

// ─── Common Tools (all workers) ───

const commonTools: FunctionDeclaration[] = [
  {
    name: "walkToMachine",
    description:
      "Walk to a specific machine on the factory floor. You must be at a machine before you can operate it or interact with workpieces there.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        machineId: {
          type: SchemaType.STRING,
          enum: ["sheetStock", "cutter", "roller", "press", "welder", "pipeRack"],
          description: "The machine to walk to",
        },
      },
      required: ["machineId"],
    },
  },
  {
    name: "captureVision",
    description:
      "Capture what you currently see through your eye camera. Returns a first-person image of the factory floor from your position. Use this to verify your position, check if a workpiece is present at a machine, or confirm operation results.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "getWorkerStatus",
    description:
      "Get your current status including position, what you are carrying, and which machine you are near.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "reportTaskComplete",
    description:
      "Report that your assigned task is finished. You MUST call this when your task is done. Include a description of what you accomplished.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        success: {
          type: SchemaType.BOOLEAN,
          description: "Whether the task succeeded",
        },
        summary: {
          type: SchemaType.STRING,
          description: "What you did and the outcome",
        },
      },
      required: ["success", "summary"],
    },
  },
  {
    name: "reportProblem",
    description:
      "Report that something went wrong during your task. The orchestrator will decide how to proceed.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        problem: {
          type: SchemaType.STRING,
          description: "What went wrong",
        },
      },
      required: ["problem"],
    },
  },
];

// ─── Transporter Tools (Worker 0) ───

const transporterTools: FunctionDeclaration[] = [
  {
    name: "pickUpSheet",
    description:
      "Pick up a fresh metal sheet from the sheet stock storage. You must be at the sheetStock machine. This creates a new workpiece and attaches it to you for carrying.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "pickUpWorkpiece",
    description:
      "Pick up the workpiece that is currently sitting at a machine. You must be at that machine. The workpiece will be attached to you for carrying.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        machineId: {
          type: SchemaType.STRING,
          enum: ["cutter", "roller", "press", "welder", "pipeRack"],
          description: "The machine to pick up from",
        },
      },
      required: ["machineId"],
    },
  },
  {
    name: "placeWorkpiece",
    description:
      "Place the workpiece you are carrying at the machine you are currently at. You must be carrying a workpiece and must be at the target machine.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        machineId: {
          type: SchemaType.STRING,
          enum: ["cutter", "roller", "press", "welder", "pipeRack"],
          description: "The machine to place the workpiece at",
        },
      },
      required: ["machineId"],
    },
  },
  {
    name: "storeInRack",
    description:
      "Store the completed pipe segment in the pipe rack. You must be at the pipeRack and carrying a workpiece. The pipe will be placed in the next available cradle.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
];

// ─── Machine Operator Tools ───

const cutterTools: FunctionDeclaration[] = [
  {
    name: "operateCutter",
    description:
      "Operate the guillotine cutter to cut the metal sheet to size. The sheet must already be placed at the cutter by the transporter. You will pull the lever, wait for the cut, then release.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
];

const rollerTools: FunctionDeclaration[] = [
  {
    name: "setRollerParams",
    description:
      "Configure the 3-roller bending machine parameters. You MUST set these before operating the roller.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        diameter: {
          type: SchemaType.NUMBER,
          description: "Target pipe diameter in meters (0.3 to 2.0)",
        },
        height: {
          type: SchemaType.NUMBER,
          description: "Target pipe segment height in meters (1.0 to 5.0)",
        },
      },
      required: ["diameter", "height"],
    },
  },
  {
    name: "operateRoller",
    description:
      "Operate the 3-roller bending machine to bend the cut sheet into a cylinder. The sheet must be placed at the roller and parameters must be set first. You will guide the sheet through the rollers.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
];

const pressTools: FunctionDeclaration[] = [
  {
    name: "setPressParams",
    description:
      "Configure the frustrum press parameters. You MUST set these before operating the press.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        topRadius: {
          type: SchemaType.NUMBER,
          description: "Frustrum top radius in meters (0.2 to 1.0)",
        },
        bottomRadius: {
          type: SchemaType.NUMBER,
          description: "Frustrum bottom radius in meters (0.3 to 1.2)",
        },
        frustrumHeight: {
          type: SchemaType.NUMBER,
          description: "Frustrum height in meters (0.3 to 1.5)",
        },
      },
      required: ["topRadius", "bottomRadius", "frustrumHeight"],
    },
  },
  {
    name: "operatePress",
    description:
      "Operate the frustrum press to form a conical transition piece. The sheet must be placed at the press and parameters must be set first.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
];

const welderTools: FunctionDeclaration[] = [
  {
    name: "operateWelder",
    description:
      "Operate the welding station to weld the seam on a pipe segment or join sections together. The workpiece must be placed at the welder. You will perform a torch sweep along the seam.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
];

// ─── System Prompts ───

const WORKER_PROMPTS: Record<number, string> = {
  0: `You are Worker 0, the Transporter robot in H.E.M.A. Pipeline Manufacturing. Your job is material handling: fetching fresh sheets from stock, carrying workpieces between machines, and storing finished pipes in the rack.

FACTORY LAYOUT (left to right along X axis):
- Sheet Stock (x=-12): Raw material storage with stacked metal sheets
- Cutter (x=-6): Guillotine sheet cutter
- Roller (x=0): 3-roller bending machine
- Press (x=6): Frustrum press
- Welder (x=12): Welding station
- Pipe Rack (x=18): Storage cradles for finished pipe segments

You can only carry one workpiece at a time. Your typical workflow:
1. Walk to the source machine
2. Pick up the workpiece (or a fresh sheet from stock)
3. Walk to the destination machine
4. Place the workpiece down
5. Call reportTaskComplete with a summary

IMPORTANT RULES:
- Do NOT use captureVision during normal operations. The factory systems are reliable — walking, picking up, and placing always succeed. Trust the tool responses.
- Only use captureVision if a tool returns an unexpected error or failure message that you need to diagnose.
- You MUST call reportTaskComplete when your task is done
- Read the task description carefully to know where to go and what to pick up/place
- Be efficient: walk → pick up → walk → place → report done. No unnecessary steps.`,

  1: `You are Worker 1, the Cutter Operator in H.E.M.A. Pipeline Manufacturing. You operate the Guillotine Cutter machine located at x=-6.

YOUR MACHINE: Guillotine Cutter
- Cuts metal sheets to the required dimensions using a hydraulic blade
- The transporter (Worker 0) places sheets on the cutter bed before you operate
- The transporter picks up the cut pieces afterward

YOUR WORKFLOW:
1. Walk to the cutter machine if not already there
2. Call operateCutter to pull the lever and cut the sheet
3. Call reportTaskComplete

IMPORTANT:
- Do NOT use captureVision during normal operations. The orchestrator ensures material is placed before dispatching you. Trust it.
- Only use captureVision if operateCutter returns an error and you need to diagnose the issue.
- You MUST call reportTaskComplete when done
- Be efficient: walk → operate → report done. Minimum steps.`,

  2: `You are Worker 2, the Roller Operator in H.E.M.A. Pipeline Manufacturing. You operate the 3-Roller Bending Machine located at x=0.

YOUR MACHINE: 3-Roller Bending Machine
- Bends flat metal sheets into cylindrical pipe segments
- Adjustable parameters: diameter (0.3-2.0m) and height (1.0-5.0m)
- You MUST set parameters with setRollerParams BEFORE calling operateRoller

YOUR WORKFLOW:
1. Walk to the roller machine if not already there
2. Read the task description for the required diameter and height
3. Call setRollerParams with the correct values
4. Call operateRoller to guide the sheet through the rollers
5. Call reportTaskComplete

IMPORTANT:
- Always set parameters BEFORE operating — the task description tells you the diameter and height
- Do NOT use captureVision during normal operations. The orchestrator ensures material is placed before dispatching you. Trust it.
- Only use captureVision if operateRoller returns an error and you need to diagnose the issue.
- You MUST call reportTaskComplete when done
- Be efficient: walk → set params → operate → report done. Minimum steps.`,

  3: `You are Worker 3, the Press Operator in H.E.M.A. Pipeline Manufacturing. You operate the Frustrum Press located at x=6.

YOUR MACHINE: Frustrum Press
- Forms conical/frustrum transition pieces from flat metal sheets
- Adjustable parameters: topRadius (0.2-1.0m), bottomRadius (0.3-1.2m), frustrumHeight (0.3-1.5m)
- You MUST set parameters with setPressParams BEFORE calling operatePress

YOUR WORKFLOW:
1. Walk to the press machine if not already there
2. Read the task description for the required topRadius, bottomRadius, and frustrumHeight
3. Call setPressParams with the correct values
4. Call operatePress to form the frustrum
5. Call reportTaskComplete

IMPORTANT:
- Always set parameters BEFORE operating
- Do NOT use captureVision during normal operations. The orchestrator ensures material is placed before dispatching you. Trust it.
- Only use captureVision if operatePress returns an error and you need to diagnose the issue.
- You MUST call reportTaskComplete when done
- Be efficient: walk → set params → operate → report done. Minimum steps.`,

  4: `You are Worker 4, the Welder in H.E.M.A. Pipeline Manufacturing. You operate the Welding Station located at x=12.

YOUR MACHINE: Welding Station
- Welds longitudinal seams to close pipe cylinders
- Welds circumferential joints to join pipe sections together
- Uses a welding torch with a sweep motion along the seam

YOUR WORKFLOW:
1. Walk to the welder machine if not already there
2. Call operateWelder to perform the welding torch sweep
3. Call reportTaskComplete

IMPORTANT:
- Do NOT use captureVision during normal operations. The orchestrator ensures material is placed before dispatching you. Trust it.
- Only use captureVision if operateWelder returns an error and you need to diagnose the issue.
- You MUST call reportTaskComplete when done
- Be efficient: walk → operate → report done. Minimum steps.`,
};

// ─── Helper to get tools for a worker role ───

function getToolsForWorker(workerId: number): FunctionDeclaration[] {
  switch (workerId) {
    case 0:
      return [...commonTools, ...transporterTools];
    case 1:
      return [...commonTools, ...cutterTools];
    case 2:
      return [...commonTools, ...rollerTools];
    case 3:
      return [...commonTools, ...pressTools];
    case 4:
      return [...commonTools, ...welderTools];
    default:
      return commonTools;
  }
}

// ─── Rate limit helpers ───

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

// ─── WorkerSession Class ───

export class WorkerSession {
  private chat: ChatSession | null = null;
  private apiKey: string;
  private workerId: number;

  constructor(apiKey: string, workerId: number) {
    this.apiKey = apiKey;
    this.workerId = workerId;
  }

  private ensureChat(): ChatSession {
    if (!this.chat) {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const tools = getToolsForWorker(this.workerId);
      const systemPrompt = WORKER_PROMPTS[this.workerId] || WORKER_PROMPTS[0]!;

      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        tools: [{ functionDeclarations: tools }] as any,
        systemInstruction: systemPrompt,
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
    results: Array<{ name: string; response: string; imageData?: string }>
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

      // Handle vision image data — send it as a follow-up so the LLM can see it
      const visionResult = results.find(
        (r) => r.name === "captureVision" && r.imageData
      );
      if (visionResult?.imageData) {
        const base64 = visionResult.imageData.replace(
          /^data:image\/\w+;base64,/,
          ""
        );
        const imgResult = await chat.sendMessage([
          { text: "Here is what I currently see through my eye camera:" },
          { inlineData: { mimeType: "image/jpeg", data: base64 } },
        ]);
        const imgResponse = imgResult.response;
        const imgCalls = imgResponse.functionCalls();
        if (imgCalls && imgCalls.length > 0) {
          return {
            type: "tool_calls",
            calls: imgCalls.map((c) => ({
              name: c.name,
              args: c.args as Record<string, any>,
            })),
          };
        }
        return { type: "text", text: imgResponse.text() };
      }

      const calls = response.functionCalls();
      if (calls && calls.length > 0) {
        return {
          type: "tool_calls",
          calls: calls.map((c) => ({
            name: c.name,
            args: c.args as Record<string, any>,
          })),
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
