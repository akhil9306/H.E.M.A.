import { HashRouter, Routes, Route } from "react-router-dom";
import { RobotProvider } from "@/context/RobotContext";
import { FactoryProvider } from "@/context/FactoryContext";
import { HomePage } from "@/pages/HomePage";
import { RobotPage } from "@/pages/RobotPage";
import "./index.css";

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/chat"
          element={
            <RobotProvider>
              <FactoryProvider>
                <RobotPage initialMode="chat" />
              </FactoryProvider>
            </RobotProvider>
          }
        />
        <Route
          path="/orchestrate"
          element={
            <RobotProvider>
              <FactoryProvider>
                <RobotPage initialMode="orchestrator" />
              </FactoryProvider>
            </RobotProvider>
          }
        />
      </Routes>
    </HashRouter>
  );
}

export default App;
