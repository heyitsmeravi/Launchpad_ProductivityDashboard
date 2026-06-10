import {
  LayoutDashboard,
  Target,
  Calendar,
  Award,
  TrendingUp,
  FileText,
  Ban,
  Settings,
  Play,
  Pause,
  Timer,
  Rocket,
  Layers,
  FolderGit2
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useApp } from "../../context/AppContext";

export default function Sidebar({ isOpen, setIsOpen }) {
  const {
    settings,
    timerSeconds,
    timerIsRunning,
    timerMode,
    timerConfig,
    setTimerIsRunning
  } = useApp();

  const links = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Tracks", path: "/tracks", icon: Target },
    { name: "Daily Planner", path: "/planner", icon: Calendar },
    { name: "Goals", path: "/goals", icon: Award },
    { name: "Analytics", path: "/analytics", icon: TrendingUp },
    { name: "Activity Log", path: "/activity-log", icon: FileText },
    { name: "Problem Solver", path: "/solver", icon: Layers },
    { name: "Projects", path: "/projects", icon: FolderGit2 },
    { name: "Distractions", path: "/distractions", icon: Ban },
    { name: "Execution Center", path: "/execution", icon: Target },
    { name: "Settings", path: "/settings", icon: Settings }
  ];

  // Helper to format remaining timer
  const getRemainingTimeStr = () => {
    const limit = timerConfig[timerMode] || 0;
    const remaining = Math.max(0, limit - timerSeconds);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Dynamic branding logo rendering based on settings (adapted for targetCompany)
  const renderLogo = () => {
    const logoType = ("general").toLowerCase();
    
    if (logoType.includes("microsoft")) {
      return (
        <div className="sidebar-logo-square">
          <div style={{ backgroundColor: "#f25022" }}></div>
          <div style={{ backgroundColor: "#7fba00" }}></div>
          <div style={{ backgroundColor: "#00a2ed" }}></div>
          <div style={{ backgroundColor: "#ffb900" }}></div>
        </div>
      );
    }
    if (logoType.includes("google")) {
      return (
        <div className="sidebar-logo-square">
          <div style={{ backgroundColor: "#4285f4" }}></div>
          <div style={{ backgroundColor: "#ea4335" }}></div>
          <div style={{ backgroundColor: "#34a853" }}></div>
          <div style={{ backgroundColor: "#fbbc05" }}></div>
        </div>
      );
    }
    if (logoType.includes("meta") || logoType.includes("facebook")) {
      return <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(to right, #0081fb, #00c6ff)" }}></div>;
    }
    if (logoType.includes("netflix")) {
      return <div style={{ width: 20, height: 20, backgroundColor: "#e50914", borderRadius: 2 }}></div>;
    }
    
    // General icon for custom company or anything else
    return <Rocket size={24} color={settings.themeColor || "var(--accent)"} />;
  };

  return (
    <>
      {/* Mobile overlay background */}
      {isOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsOpen(false)}
        ></div>
      )}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div>
          <div className="sidebar-brand">
            {renderLogo()}
            <span className="sidebar-title">LaunchPad</span>
            {/* Close button for mobile */}
            <button 
              className="mobile-close-btn"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          <nav className="sidebar-links">
          {links.map(link => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              >
                <Icon size={18} />
                <span>{link.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Floating Timer widget in sidebar */}
      <div className="sidebar-timer">
        <div className="sidebar-timer-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Timer size={12} className={timerIsRunning ? "animate-pulse" : ""} />
          <span>{timerMode === "focus" ? "Focus" : "Rest"}</span>
        </div>
        <div className="sidebar-timer-time">
          {getRemainingTimeStr()}
        </div>
        <button 
          onClick={() => setTimerIsRunning(!timerIsRunning)}
          style={{
            background: timerIsRunning ? "rgba(239, 68, 68, 0.15)" : "rgba(var(--accent-rgb), 0.15)",
            color: timerIsRunning ? "#ef4444" : "var(--accent)",
            border: timerIsRunning ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(var(--accent-rgb), 0.3)",
            borderRadius: "4px",
            padding: "4px 12px",
            fontSize: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginTop: "6px"
          }}
        >
          {timerIsRunning ? <Pause size={10} /> : <Play size={10} />}
          <span>{timerIsRunning ? "Pause" : "Start"}</span>
        </button>
      </div>
    </aside>
    </>
  );
}