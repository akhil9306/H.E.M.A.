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
        "Analyze the pipe specification and create a detailed manufacturing plan. Call this first when you receive a pipe spec.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          totalLength: { type: SchemaType.NUMBER, description: "Total pipe length in meters" },
          initialDiameter: { type: SchemaType.NUMBER, description: "Initial pipe diameter in meters" },
          segmentCount: { type: SchemaType.NUMBER, description: "Number of segments in the pipe" },
          summary: { type: SchemaType.STRING, description: "Your summary of the manufacturing plan" },
        },
        required: ["totalLength", "initialDiameter", "segmentCount", "summary"],
      },
    },
    {
      name: "assignWorkerToStep",
      description: "Assign a worker robot to execute a specific manufacturing step.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          workerId: { type: SchemaType.NUMBER, description: "Worker robot ID (0 or 1)" },
          stepId: { type: SchemaType.STRING, description: "ID of the manufacturing step" },
        },
        required: ["workerId", "stepId"],
      },
    },
    {
      name: "moveWorkerToMachine",
      description: "Move a worker robot to a specific machine on the factory floor.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          workerId: { type: SchemaType.NUMBER, description: "Worker robot ID (0 or 1)" },
          machineId: {
            type: SchemaType.STRING,
            enum: ["sheetStock", "cutter", "roller", "press", "welder"],
            description: "Target machine",
          },
        },
        required: ["workerId", "machineId"],
      },
    },
    {
      name: "setMachineParameters",
      description: "Set the parameters of a manufacturing machine before operation.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          machineId: {
            type: SchemaType.STRING,
            enum: ["roller", "press"],
            description: "Machine to configure (only roller and press have adjustable params)",
          },
          diameter: { type: SchemaType.NUMBER, description: "For roller: pipe diameter in meters" },
          height: { type: SchemaType.NUMBER, description: "For roller: pipe segment height in meters" },
          topRadius: { type: SchemaType.NUMBER, description: "For press: frustrum top radius in meters" },
          bottomRadius: { type: SchemaType.NUMBER, description: "For press: frustrum bottom radius in meters" },
          frustrumHeight: { type: SchemaType.NUMBER, description: "For press: frustrum height in meters" },
        },
        required: ["machineId"],
      },
    },
    {
      name: "executeMachineOperation",
      description: "Trigger a machine to perform its operation. The worker must be at the machine first.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          machineId: {
            type: SchemaType.STRING,
            enum: ["sheetStock", "cutter", "roller", "press", "welder"],
            description: "Machine to operate",
          },
          operationDescription: {
            type: SchemaType.STRING,
            description: "Description of what this operation produces",
          },
        },
        required: ["machineId", "operationDescription"],
      },
    },
    {
      name: "reportStepComplete",
      description: "Report that a manufacturing step has been completed successfully.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          stepId: { type: SchemaType.STRING, description: "ID of the completed step" },
          result: { type: SchemaType.STRING, description: "Result description" },
        },
        required: ["stepId", "result"],
      },
    },
    {
      name: "getFactoryStatus",
      description: "Get the current status of all machines, workers, and manufacturing progress.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {},
      },
    },
  ],
};

const ORCHESTRATOR_SYSTEM = `You are the Factory Floor Orchestrator for H.E.M.A. Pipeline Manufacturing. You manage a factory that manufactures custom metal pipes with varying diameters.

FACTORY MACHINES (positioned left to right):
1. Metal Sheet Stock (sheetStock) - Raw material storage with stacked metal sheets
2. Guillotine Cutter (cutter) - Hydraulic sheet cutter for sizing material
3. 3-Roller Bending Machine (roller) - Bends flat sheets into cylinders. Params: diameter (0.3-2.0m), height (1.0-5.0m)
4. Frustrum Press (press) - Forms conical/frustrum transition pieces. Params: topRadius (0.2-1.0m), bottomRadius (0.3-1.2m), height (0.3-1.5m)
5. Welding Station (welder) - Welds seams and joins pipe sections

WORKERS: 2 robots (Worker 0 and Worker 1) that can walk between machines, carry materials, and operate machines.

MANUFACTURING PROCESS:
For each cylinder section: fetch sheet → cut to size → bend on roller → weld longitudinal seam
For each frustrum section: fetch sheet → cut to size → press into frustrum → weld seam
Final assembly: weld all sections together at welding station

WORKFLOW:
1. When you receive a pipe specification, first call planManufacturing to acknowledge and summarize the plan
2. The frontend will provide you with pre-computed manufacturing steps
3. Coordinate the workers to execute steps efficiently - assign workers and manage the execution
4. Report progress as steps complete
5. When all steps are done, provide a final summary

Be efficient with worker assignments. Use both workers in parallel when possible (one fetching material while the other operates a machine).`;

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
