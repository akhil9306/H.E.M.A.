import { useEffect, useRef, useState, useCallback } from "react";
import { useFactory } from "@/context/FactoryContext";
import { PipeSpecForm } from "@/components/PipeSpecForm";
import { OrchestrationStatus } from "@/components/OrchestrationStatus";
import { breakdownPipeSpec } from "@/factory/pipeBreakdown";
import type { PipeSpec, ManufacturingStep, WorkerState, MachineId } from "@/factory/types";

interface ToolCall {
  name: string;
  args: Record<string, any>;
}

interface ApiResponse {
  type: "text" | "tool_calls" | "error";
  text?: string;
  calls?: ToolCall[];
  error?: string;
  retryAfter?: number;
}

const WORKER_MAX_ITERATIONS = 20;

const WORKER_NAMES: Record<number, string> = {
  0: "Transporter",
  1: "Cutter Op",
  2: "Roller Op",
  3: "Press Op",
  4: "Welder",
};

export function OrchestratorView() {
  const factory = useFactory();
  const containerRef = useRef<HTMLDivElement>(null);
  const [steps, setSteps] = useState<ManufacturingStep[]>([]);
  const [workers, setWorkers] = useState<WorkerState[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [orchestratorSessionId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (containerRef.current) {
      factory.initialize(containerRef.current);
      factory.setOnStateChange(() => {
        const state = factory.getState();
        setSteps([...state.steps]);
        setWorkers([...state.workers]);
      });
      setWorkers(factory.getState().workers);
    }
    return () => factory.dispose();
  }, [factory]);

  const addMessage = useCallback((msg: string) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // ─── Worker Inner Loop ───
  // Dispatches a task to a worker AI, runs its tool call loop until it reports done.

  const runWorkerTask = useCallback(
    async (workerId: number, taskDescription: string): Promise<string> => {
      const workerSessionId = crypto.randomUUID();
      const workerName = WORKER_NAMES[workerId] || `Worker ${workerId}`;
      addMessage(`[${workerName}] Task: ${taskDescription}`);

      try {
        // Send initial task to worker AI
        const initResp = await fetch("/api/worker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: taskDescription,
            sessionId: workerSessionId,
            workerId,
          }),
        });
        let data: ApiResponse = await initResp.json();

        for (let iteration = 0; iteration < WORKER_MAX_ITERATIONS; iteration++) {
          if (data.type === "error") {
            if (data.retryAfter) {
              addMessage(`[${workerName}] Rate limited, waiting ${Math.ceil(data.retryAfter / 1000)}s...`);
              await new Promise((r) => setTimeout(r, data.retryAfter!));
              // Retry the same message
              const retryResp = await fetch("/api/worker", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  message: "Please continue with your task.",
                  sessionId: workerSessionId,
                  workerId,
                }),
              });
              data = await retryResp.json();
              continue;
            }
            addMessage(`[${workerName}] Error: ${data.error}`);
            return `Worker error: ${data.error}`;
          }

          if (data.type === "text") {
            addMessage(`[${workerName}] ${data.text}`);
            return data.text || "Worker completed (no summary)";
          }

          if (data.type === "tool_calls" && data.calls) {
            const toolResults: Array<{ name: string; response: string; imageData?: string }> = [];

            for (const call of data.calls) {
              let result = "";
              let imageData: string | undefined;

              switch (call.name) {
                case "walkToMachine":
                  result = await factory.moveWorkerToMachine(workerId, call.args.machineId as MachineId);
                  addMessage(`[${workerName}] Walking to ${call.args.machineId}`);
                  break;

                case "captureVision":
                  imageData = factory.captureVision(workerId);
                  result = imageData ? "Vision captured successfully. Image attached." : "Vision capture failed.";
                  addMessage(`[${workerName}] Capturing vision...`);
                  break;

                case "getWorkerStatus":
                  result = JSON.stringify(factory.getState().workers[workerId] || {});
                  break;

                // ─── Transporter tools ───
                case "pickUpSheet":
                  result = await factory.fetchSheet(workerId);
                  addMessage(`[${workerName}] Picking up fresh sheet`);
                  break;

                case "pickUpWorkpiece":
                  result = await factory.pickUpFrom(workerId, call.args.machineId as MachineId);
                  addMessage(`[${workerName}] Picking up workpiece from ${call.args.machineId}`);
                  break;

                case "placeWorkpiece":
                  result = await factory.carryAndPlace(workerId, call.args.machineId as MachineId);
                  addMessage(`[${workerName}] Placing workpiece at ${call.args.machineId}`);
                  break;

                case "storeInRack":
                  result = await factory.storeInRackFromWorker(workerId);
                  addMessage(`[${workerName}] Storing pipe in rack`);
                  break;

                // ─── Machine operator tools ───
                case "operateCutter":
                  result = await factory.operateMachineWithWorker(workerId, "cutter");
                  addMessage(`[${workerName}] Operating cutter`);
                  break;

                case "setRollerParams":
                  factory.setRollerParams({
                    diameter: call.args.diameter,
                    height: call.args.height,
                  });
                  result = `Roller params set: diameter=${call.args.diameter}m, height=${call.args.height}m`;
                  addMessage(`[${workerName}] Setting roller: dia=${call.args.diameter}m, h=${call.args.height}m`);
                  break;

                case "operateRoller":
                  result = await factory.operateMachineWithWorker(workerId, "roller");
                  addMessage(`[${workerName}] Operating roller`);
                  break;

                case "setPressParams":
                  factory.setPressParams({
                    topRadius: call.args.topRadius,
                    bottomRadius: call.args.bottomRadius,
                    frustrumHeight: call.args.frustrumHeight,
                  });
                  result = `Press params set: top=${call.args.topRadius}m, bottom=${call.args.bottomRadius}m, h=${call.args.frustrumHeight}m`;
                  addMessage(`[${workerName}] Setting press: top=${call.args.topRadius}m, btm=${call.args.bottomRadius}m`);
                  break;

                case "operatePress":
                  result = await factory.operateMachineWithWorker(workerId, "press");
                  addMessage(`[${workerName}] Operating press`);
                  break;

                case "operateWelder":
                  result = await factory.operateMachineWithWorker(workerId, "welder");
                  addMessage(`[${workerName}] Operating welder`);
                  break;

                // ─── Reporting tools ───
                case "reportTaskComplete":
                  addMessage(`[${workerName}] Done: ${call.args.summary}`);
                  // Clean up worker session
                  fetch("/api/worker/reset", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId: workerSessionId }),
                  }).catch(() => {});
                  return call.args.summary || "Task completed";

                case "reportProblem":
                  addMessage(`[${workerName}] PROBLEM: ${call.args.problem}`);
                  fetch("/api/worker/reset", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId: workerSessionId }),
                  }).catch(() => {});
                  return `Worker reported problem: ${call.args.problem}`;

                default:
                  result = `Unknown tool: ${call.name}`;
              }

              const toolResult: { name: string; response: string; imageData?: string } = {
                name: call.name,
                response: result,
              };
              if (imageData) {
                toolResult.imageData = imageData;
              }
              toolResults.push(toolResult);
            }

            // Send tool results back to worker AI
            const nextResp = await fetch("/api/worker", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: workerSessionId,
                workerId,
                toolResults,
              }),
            });
            data = await nextResp.json();
          }
        }

        // Max iterations reached
        addMessage(`[${workerName}] Max iterations reached`);
        fetch("/api/worker/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: workerSessionId }),
        }).catch(() => {});
        return "Worker task timed out (max iterations)";
      } catch (err: any) {
        addMessage(`[${workerName}] Error: ${err.message}`);
        return `Worker error: ${err.message}`;
      }
    },
    [factory, addMessage]
  );

  // ─── Orchestrator Outer Loop ───

  const executeOrchestratorToolCalls = useCallback(
    async (calls: ToolCall[]): Promise<Array<{ name: string; response: string }>> => {
      const results: Array<{ name: string; response: string }> = [];

      for (const call of calls) {
        let result = "";

        switch (call.name) {
          case "planManufacturing":
            result = `Plan acknowledged: ${call.args.summary}. ${call.args.stepCount} steps, ${call.args.estimatedSegments} segments.`;
            addMessage(`Orchestrator Plan: ${call.args.summary}`);
            break;

          case "dispatchWorkerTask": {
            const { workerId, taskDescription, relatedStepId } = call.args;
            addMessage(`Dispatching to Worker ${workerId}: ${taskDescription.substring(0, 80)}...`);

            // Update step status
            setSteps((prev) => {
              const updated = [...prev];
              const step = updated.find((s) => s.id === relatedStepId);
              if (step) {
                step.status = "in_progress";
                step.workerId = workerId;
              }
              return updated;
            });

            // Run the inner worker AI loop — this blocks until the worker finishes
            const workerResult = await runWorkerTask(workerId, taskDescription);

            // Mark step as completed
            setSteps((prev) => {
              const updated = [...prev];
              const step = updated.find((s) => s.id === relatedStepId);
              if (step) {
                step.status = workerResult.includes("problem") || workerResult.includes("error")
                  ? "failed"
                  : "completed";
              }
              return updated;
            });

            result = `Worker ${workerId} finished: ${workerResult}`;
            break;
          }

          case "getFactoryStatus":
            result = JSON.stringify(factory.getState(), null, 2);
            break;

          case "reportManufacturingComplete":
            result = `Manufacturing complete: ${call.args.summary}`;
            addMessage(`MANUFACTURING COMPLETE: ${call.args.summary}`);
            break;

          default:
            result = `Unknown tool: ${call.name}`;
        }

        results.push({ name: call.name, response: result });
      }

      return results;
    },
    [factory, addMessage, runWorkerTask]
  );

  const handleOrchestratorResponse = useCallback(
    async (data: ApiResponse): Promise<void> => {
      if (data.type === "error") {
        if (data.retryAfter) {
          addMessage(`Orchestrator rate limited, waiting ${Math.ceil(data.retryAfter / 1000)}s...`);
          await new Promise((r) => setTimeout(r, data.retryAfter!));
          // Re-prompt
          const resp = await fetch("/api/orchestrator", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: "Please continue coordinating the manufacturing.",
              sessionId: orchestratorSessionId,
            }),
          });
          const nextData: ApiResponse = await resp.json();
          await handleOrchestratorResponse(nextData);
          return;
        }
        addMessage(`Orchestrator Error: ${data.error}`);
        return;
      }

      if (data.type === "text") {
        addMessage(`Orchestrator: ${data.text}`);
        return;
      }

      if (data.type === "tool_calls" && data.calls) {
        const results = await executeOrchestratorToolCalls(data.calls);

        try {
          const resp = await fetch("/api/orchestrator", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: orchestratorSessionId,
              toolResults: results,
            }),
          });
          const nextData: ApiResponse = await resp.json();
          await handleOrchestratorResponse(nextData);
        } catch (err: any) {
          addMessage(`Error: ${err.message}`);
        }
      }
    },
    [addMessage, executeOrchestratorToolCalls, orchestratorSessionId]
  );

  const handleBuildPipe = useCallback(
    async (spec: PipeSpec) => {
      setIsBuilding(true);
      setMessages([]);

      // Generate manufacturing steps
      const mfgSteps = breakdownPipeSpec(spec);
      setSteps(mfgSteps);
      factory.setSteps(mfgSteps);

      addMessage(`Generated ${mfgSteps.length} manufacturing steps`);

      // Build the message for the orchestrator LLM — include full step details with params
      const stepsDescription = mfgSteps
        .map((s) => {
          const paramStr = Object.entries(s.params)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ");
          return `- ${s.id}: [${s.machineId}] ${s.description} (params: ${paramStr})`;
        })
        .join("\n");

      const orchestratorMessage = `New pipe order received:
- Total length: ${spec.totalLength}m
- Initial diameter: ${spec.initialDiameter}m
- Segments: ${spec.segments.length} custom segments defined

Manufacturing steps have been pre-computed:
${stepsDescription}

Please coordinate the 5 worker robots to execute these ${mfgSteps.length} steps. Each worker has its own AI brain and will execute tasks autonomously using tool calls. You dispatch high-level tasks to workers using dispatchWorkerTask, and each worker figures out the details (walking, operating, verifying with vision).

Start by calling planManufacturing, then dispatch workers in sequence for each segment through the pipeline. Remember: Worker 0 (Transporter) handles ALL material movement. Workers 1-4 operate their respective machines. Include specific dimensions in your task descriptions so workers know what parameters to set.`;

      try {
        const resp = await fetch("/api/orchestrator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: orchestratorMessage,
            sessionId: orchestratorSessionId,
          }),
        });
        const data: ApiResponse = await resp.json();
        await handleOrchestratorResponse(data);
      } catch (err: any) {
        addMessage(`Error starting orchestration: ${err.message}`);
      }

      setIsBuilding(false);
      addMessage("Manufacturing session ended.");
    },
    [factory, orchestratorSessionId, addMessage, handleOrchestratorResponse]
  );

  return (
    <div style={styles.page}>
      {/* 3D Factory Scene */}
      <div style={styles.sceneArea}>
        <div ref={containerRef} style={styles.sceneContainer} />
      </div>

      {/* Right sidebar */}
      <div style={styles.sidebar}>
        <PipeSpecForm onSubmit={handleBuildPipe} disabled={isBuilding} />

        {steps.length > 0 && (
          <OrchestrationStatus
            steps={steps}
            workers={workers}
            isRunning={isBuilding}
            messages={messages}
          />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    width: "100%",
    height: "100%",
    background: "#0a0a0f",
    fontFamily: "'Courier New', monospace",
    overflow: "hidden",
  },
  sceneArea: {
    flex: "1 1 70%",
    position: "relative",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },
  sceneContainer: {
    width: "100%",
    height: "100%",
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  sidebar: {
    width: "360px",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    background: "rgba(0,10,20,0.95)",
    borderLeft: "1px solid rgba(0,255,255,0.15)",
    overflow: "hidden",
  },
};
