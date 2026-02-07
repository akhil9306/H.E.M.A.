import { createContext, useContext, useRef } from "react";
import { RobotController } from "@/robot/RobotController";

const RobotContext = createContext<RobotController | null>(null);

export function RobotProvider({ children }: { children: React.ReactNode }) {
  const controllerRef = useRef<RobotController>(new RobotController());
  return (
    <RobotContext.Provider value={controllerRef.current}>
      {children}
    </RobotContext.Provider>
  );
}

export function useRobot(): RobotController {
  const ctx = useContext(RobotContext);
  if (!ctx) throw new Error("useRobot must be used within RobotProvider");
  return ctx;
}
