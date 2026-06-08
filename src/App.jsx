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

function App() {
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-content">
        <Topbar />

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
    </div>
  );
}

export default App;