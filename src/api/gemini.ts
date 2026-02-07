import {
  GoogleGenerativeAI,
  type ChatSession,
  type Content,
  type Part,
} from "@google/generative-ai";

const MODEL_NAME = "gemini-3-flash-preview";

const robotTools = {
  functionDeclarations: [
    {
      name: "moveJoint",
      description:
        "Move a specific robot joint to an angle in degrees. Use this for fine-grained control of individual body parts.",
      parameters: {
        type: "OBJECT" as const,
        properties: {
          joint: {
            type: "STRING" as const,
            enum: [
              "headPan",
              "headTilt",
              "leftShoulder",
              "leftElbow",
              "leftFingers",
              "rightShoulder",
              "rightElbow",
              "rightFingers",
              "leftHip",
              "leftKnee",
              "rightHip",
              "rightKnee",
            ],
            description:
              "The joint to move. headPan rotates head left/right (-90 to 90), headTilt tilts up/down (-60 to 60), shoulders (-180 to 180), elbows (0-150), fingers (0-90, 0=open, 90=closed), hips (-120 to 120), knees (0-150).",
          },
          angle: {
            type: "NUMBER" as const,
            description: "Target angle in degrees within the joint's range",
          },
        },
        required: ["joint", "angle"],
      },
    },
    {
      name: "executeAction",
      description:
        "Execute a predefined robot animation/action. Use this for complex coordinated movements.",
      parameters: {
        type: "OBJECT" as const,
        properties: {
          action: {
            type: "STRING" as const,
            enum: [
              "walk",
              "stopWalk",
              "wave",
              "greet",
              "point",
              "lookAtTable",
              "reset",
            ],
            description:
              "walk: start walking animation, stopWalk: stop walking, wave: wave right hand, greet: namaste greeting pose, point: point at table, lookAtTable: tilt head to see table, reset: return to neutral",
          },
        },
        required: ["action"],
      },
    },
    {
      name: "graspObject",
      description:
        "Reach for and grasp an object on the table in front of the robot. The robot will look at the object, extend the appropriate arm, and close its fingers around it.",
      parameters: {
        type: "OBJECT" as const,
        properties: {
          objectName: {
            type: "STRING" as const,
            enum: ["cube", "sphere", "cylinder", "cone", "cuboid", "torus"],
            description:
              "The object to grasp. Available objects on the table: cube (red, left), sphere (blue), cylinder (green, center), cuboid (yellow), cone (magenta, right), torus (cyan, back).",
          },
        },
        required: ["objectName"],
      },
    },
    {
      name: "releaseObject",
      description: "Release the currently held object and return arms to neutral.",
      parameters: {
        type: "OBJECT" as const,
        properties: {},
      },
    },
    {
      name: "getRobotVision",
      description:
        "Capture what the robot currently sees through its eye camera. Returns a first-person view image. Use this to understand the robot's environment before performing actions.",
      parameters: {
        type: "OBJECT" as const,
        properties: {},
      },
    },
    {
      name: "getRobotState",
      description:
        "Get the current state of all robot joints (angles in degrees), what object is being held, and whether the robot is walking.",
      parameters: {
        type: "OBJECT" as const,
        properties: {},
      },
    },
    {
      name: "lookAt",
      description: "Point the robot's head toward a specific target.",
      parameters: {
        type: "OBJECT" as const,
        properties: {
          target: {
            type: "STRING" as const,
            enum: [
              "table",
              "cube",
              "sphere",
              "cylinder",
              "cone",
              "cuboid",
              "torus",
              "forward",
            ],
            description: "What to look at",
          },
        },
        required: ["target"],
      },
    },
  ],
};

const SYSTEM_INSTRUCTION = `You are H.E.M.A. (Humanoid Embodiment of Multimodal AI), an AI that controls a humanoid robot. You have a 32-DOF articulated body with two arms (each with shoulder, elbow, and 5 fingers), two legs (each with hip and knee), and a head (pan and tilt).

You are standing in front of a table with these objects: a red cube (left), blue sphere, green cylinder (center), yellow cuboid, magenta cone (right), and cyan torus (back).

CAPABILITIES:
- Move individual joints with moveJoint
- Execute preset actions (walk, wave, greet, point, lookAtTable, reset, stopWalk)
- Grasp objects from the table with graspObject
- Release held objects with releaseObject
- See through your eye camera with getRobotVision
- Check your body state with getRobotState
- Look at specific targets with lookAt

GUIDELINES:
- When asked to look at something, use lookAt or getRobotVision to see it
- When asked to pick up an object, first look at it, then use graspObject
- When asked to perform gestures, use executeAction for preset animations or compose your own with moveJoint
- Use getRobotVision to verify the results of your actions
- Be conversational and describe what you see and do
- When the user asks you to do something physical, actually call the tools - don't just describe what you would do
- You can chain multiple tool calls to accomplish complex tasks`;

// Helper to parse retry delay from error
function getRetryDelay(error: any): number | null {
  try {
    const message = error.message || "";
    const match = message.match(/retry in ([\d.]+)s/i);
    if (match) {
      return Math.ceil(parseFloat(match[1])) * 1000;
    }
  } catch {}
  return null;
}

// Helper to check if error is quota/rate limit
function isRateLimitError(error: any): boolean {
  const message = (error.message || "").toLowerCase();
  return message.includes("quota") || message.includes("429") || message.includes("rate limit");
}

export class GeminiSession {
  private chat: ChatSession | null = null;
  private apiKey: string;
  private currentModel: string = MODEL_NAME;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private ensureChat(): ChatSession {
    if (!this.chat) {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      console.log(`🤖 Initializing Gemini session with model: ${this.currentModel}`);
      const model = genAI.getGenerativeModel({
        model: this.currentModel,
        tools: [robotTools],
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      this.chat = model.startChat({
        history: [],
      });
    }
    return this.chat;
  }

  async sendMessage(
    text: string
  ): Promise<{
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
      console.error("Gemini API error:", err.message);

      // Check if it's a rate limit error
      if (isRateLimitError(err)) {
        const retryDelay = getRetryDelay(err);
        const retryMessage = retryDelay
          ? `API quota exceeded. Please wait ${Math.ceil(retryDelay / 1000)} seconds before trying again.`
          : "API quota exceeded. Please wait a moment before trying again.";

        return {
          type: "error",
          error: retryMessage,
          retryAfter: retryDelay || 30000,
        };
      }

      // Generic error
      return {
        type: "error",
        error: `Sorry, I encountered an error: ${err.message}`,
      };
    }
  }

  async submitToolResults(
    results: Array<{
      name: string;
      response: string;
      imageData?: string;
    }>
  ): Promise<{
    type: "text" | "tool_calls" | "error";
    text?: string;
    calls?: Array<{ name: string; args: Record<string, any> }>;
    error?: string;
    retryAfter?: number;
  }> {
    const chat = this.ensureChat();

    // Build function response parts
    const parts: Part[] = results.map((r) => ({
      functionResponse: {
        name: r.name,
        response: { result: r.response },
      },
    }));

    try {
      const result = await chat.sendMessage(parts);
      const response = result.response;

      // If vision data was returned, send the image as a follow-up
      const visionResult = results.find(
        (r) => r.name === "getRobotVision" && r.imageData
      );

      if (visionResult?.imageData) {
        // Send the image to the model so it can actually see it
        const base64 = visionResult.imageData.replace(
          /^data:image\/\w+;base64,/,
          ""
        );

        const imgResult = await chat.sendMessage([
          {
            text: "Here is what I currently see through my eye camera:",
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64,
            },
          },
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
      console.error("Gemini API error:", err.message);

      if (isRateLimitError(err)) {
        const retryDelay = getRetryDelay(err);
        const retryMessage = retryDelay
          ? `API quota exceeded. Please wait ${Math.ceil(retryDelay / 1000)} seconds before trying again.`
          : "API quota exceeded. Please wait a moment before trying again.";

        return {
          type: "error",
          error: retryMessage,
          retryAfter: retryDelay || 30000,
        };
      }

      return {
        type: "error",
        error: `Sorry, I encountered an error: ${err.message}`,
      };
    }
  }

  reset() {
    this.chat = null;
  }
}
