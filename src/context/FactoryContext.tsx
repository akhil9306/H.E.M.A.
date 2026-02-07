import { createContext, useContext, useRef } from "react";
import { FactoryController } from "@/factory/FactoryController";

const FactoryContext = createContext<FactoryController | null>(null);

export function FactoryProvider({ children }: { children: React.ReactNode }) {
  const controllerRef = useRef<FactoryController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new FactoryController();
  }

  return (
    <FactoryContext.Provider value={controllerRef.current}>
      {children}
    </FactoryContext.Provider>
  );
}

export function useFactory(): FactoryController {
  const ctx = useContext(FactoryContext);
  if (!ctx) throw new Error("useFactory must be used within FactoryProvider");
  return ctx;
}
