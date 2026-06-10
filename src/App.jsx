import { Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Tracks from "./pages/Tracks";
import Planner from "./pages/Planner";
import Goals from "./pages/Goals";
import Analytics from "./pages/Analytics";
import ActivityLog from "./pages/ActivityLog";
import Distractions from "./pages/Distractions";
import Settings from "./pages/Settings";
import ExecutionCenter from "./pages/ExecutionCenter";
import DSA from "./pages/DSA";
import Projects from "./pages/Projects";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import GlobalTimerCompletion from "./components/GlobalTimerCompletion";

import { useState } from "react";

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={mobileMenuOpen} setIsOpen={setMobileMenuOpen} />

      <div className="main-content">
        <Topbar toggleMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tracks" element={<Tracks />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/activity-log" element={<ActivityLog />} />
          <Route path="/distractions" element={<Distractions />} />
          <Route path="/solver" element={<DSA />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/execution" element={<ExecutionCenter />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>

      <GlobalTimerCompletion />
    </div>
  );
}

export default App;