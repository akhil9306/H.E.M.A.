import { useEffect, useRef, useState, useCallback } from "react";
import { useFactory } from "@/context/FactoryContext";
import { PipeSpecForm } from "@/components/PipeSpecForm";
import { OrchestrationStatus } from "@/components/OrchestrationStatus";
import { breakdownPipeSpec } from "@/factory/pipeBreakdown";
import type { PipeSpec, ManufacturingStep, WorkerState, MachineId } from "@/factory/types";

interface OrchestratorToolCall {
  name: string;
  args: Record<string, any>;
}

interface OrchestratorApiResponse {
  type: "text" | "tool_calls" | "error";
  text?: string;
  calls?: OrchestratorToolCall[];
  error?: string;
}

export function OrchestratorView() {
  const factory = useFactory();
  const containerRef = useRef<HTMLDivElement>(null);
  const [steps, setSteps] = useState<ManufacturingStep[]>([]);
  const [workers, setWorkers] = useState<WorkerState[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (containerRef.current) {
      factory.initialize(containerRef.current);
      factory.setOnStateChange(() => {
        const state = factory.getState();
        setSteps([...state.steps]);
        setWorkers([...state.workers]);
      });
      // Get initial worker state
      setWorkers(factory.getState().workers);
    }
    return () => factory.dispose();
  }, [factory]);

  const addMessage = useCallback((msg: string) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const executeOrchestratorToolCalls = useCallback(
    async (calls: OrchestratorToolCall[]): Promise<Array<{ name: string; response: string }>> => {
      const results: Array<{ name: string; response: string }> = [];

      for (const call of calls) {
        let result = "";

        switch (call.name) {
          case "planManufacturing":
            result = `Manufacturing plan acknowledged: ${call.args.summary}`;
            addMessage(`Plan: ${call.args.summary}`);
            break;

          case "assignWorkerToStep": {
            const step = steps.find((s) => s.id === call.args.stepId);
            if (step) {
              step.workerId = call.args.workerId;
              setSteps([...steps]);
              result = `Worker ${call.args.workerId} assigned to step ${call.args.stepId}`;
            } else {
              result = `Step ${call.args.stepId} not found`;
            }
            break;
          }

          case "moveWorkerToMachine":
            result = await factory.moveWorkerToMachine(
              call.args.workerId,
              call.args.machineId as MachineId
            );
            addMessage(`Worker ${call.args.workerId} moved to ${call.args.machineId}`);
            break;

          case "setMachineParameters":
            if (call.args.machineId === "roller") {
              factory.setRollerParams({
                diameter: call.args.diameter || 1.0,
                height: call.args.height || 3.0,
              });
              result = `Roller set: dia=${call.args.diameter}m, h=${call.args.height}m`;
            } else if (call.args.machineId === "press") {
              factory.setPressParams({
                topRadius: call.args.topRadius || 0.4,
                bottomRadius: call.args.bottomRadius || 0.6,
                frustrumHeight: call.args.frustrumHeight || 0.8,
              });
              result = `Press set: top=${call.args.topRadius}m, btm=${call.args.bottomRadius}m, h=${call.args.frustrumHeight}m`;
            } else {
              result = `Machine ${call.args.machineId} has no adjustable parameters`;
            }
            addMessage(result);
            break;

          case "executeMachineOperation":
            addMessage(`Operating ${call.args.machineId}: ${call.args.operationDescription}`);
            result = await factory.triggerMachine(call.args.machineId as MachineId);
            break;

          case "reportStepComplete": {
            const completedStep = steps.find((s) => s.id === call.args.stepId);
            if (completedStep) {
              completedStep.status = "completed";
              setSteps([...steps]);
            }
            result = `Step ${call.args.stepId} marked complete: ${call.args.result}`;
            addMessage(`Completed: ${call.args.result}`);
            break;
          }

          case "getFactoryStatus":
            result = JSON.stringify(factory.getState(), null, 2);
            break;

          default:
            result = `Unknown tool: ${call.name}`;
        }

        results.push({ name: call.name, response: result });
      }

      return results;
    },
    [factory, steps, addMessage]
  );

  const handleOrchestratorResponse = useCallback(
    async (data: OrchestratorApiResponse): Promise<void> => {
      if (data.type === "error") {
        addMessage(`Error: ${data.error}`);
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
            body: JSON.stringify({ sessionId, toolResults: results }),
          });
          const nextData: OrchestratorApiResponse = await resp.json();
          await handleOrchestratorResponse(nextData);
        } catch (err: any) {
          addMessage(`Error: ${err.message}`);
        }
      }
    },
    [addMessage, executeOrchestratorToolCalls, sessionId]
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

      // Build the message for the orchestrator LLM
      const stepsDescription = mfgSteps
        .map((s) => `- ${s.id}: [${s.machineId}] ${s.description}`)
        .join("\n");

      const orchestratorMessage = `New pipe order received:
- Total length: ${spec.totalLength}m
- Initial diameter: ${spec.initialDiameter}m
- Segments: ${spec.segments.length} custom segments defined

Manufacturing steps have been pre-computed:
${stepsDescription}

Please coordinate the 2 worker robots to execute these ${mfgSteps.length} steps. Start by planning the manufacturing, then begin executing steps. Use both workers efficiently.`;

      try {
        const resp = await fetch("/api/orchestrator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: orchestratorMessage, sessionId }),
        });
        const data: OrchestratorApiResponse = await resp.json();
        await handleOrchestratorResponse(data);
      } catch (err: any) {
        addMessage(`Error starting orchestration: ${err.message}`);
      }

      // Also execute the steps locally in sequence
      await factory.executeAllSteps();

      setIsBuilding(false);
      addMessage("Manufacturing complete!");
    },
    [factory, sessionId, addMessage, handleOrchestratorResponse]
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
