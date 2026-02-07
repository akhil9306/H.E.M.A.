import { useState } from "react";
import { RobotProvider } from "@/context/RobotContext";
import { FactoryProvider } from "@/context/FactoryContext";
import { HomePage } from "@/pages/HomePage";
import { RobotPage } from "@/pages/RobotPage";
import "./index.css";

export function App() {
  const [page, setPage] = useState<"home" | "robot">("home");

  if (page === "home") {
    return <HomePage onStart={() => setPage("robot")} />;
  }

  return (
    <RobotProvider>
      <FactoryProvider>
        <RobotPage />
      </FactoryProvider>
    </RobotProvider>
  );
}

export default App;
