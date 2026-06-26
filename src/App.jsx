import { Routes, Route, useLocation } from "react-router-dom";

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
import AIAdvisor from "./pages/AIAdvisor";
import FocusWorkspace from "./pages/FocusWorkspace";
import FocusRecoveryManager from "./components/FocusRecoveryManager";

import { useState } from "react";

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isFocusWorkspace = location.pathname === "/focus";

  return (
    <div className="app-layout">
      {!isFocusWorkspace && <Sidebar isOpen={mobileMenuOpen} setIsOpen={setMobileMenuOpen} />}

      <div className="main-content" style={{ paddingLeft: isFocusWorkspace ? 0 : undefined }}>
        {!isFocusWorkspace && <Topbar toggleMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />}

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/focus" element={<FocusWorkspace />} />
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
          <Route path="/ai-coach" element={<AIAdvisor />} />
        </Routes>
      </div>

      <GlobalTimerCompletion />
      <FocusRecoveryManager />
    </div>
  );
}

export default App;