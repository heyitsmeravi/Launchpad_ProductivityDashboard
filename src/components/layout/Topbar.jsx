import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { Timer, Award, Menu } from "lucide-react";

export default function Topbar({ toggleMenu }) {
  const { settings, todayFocusSeconds } = useApp();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const focusHours = (todayFocusSeconds / 3600).toFixed(1);
  const dsaTarget = settings?.permanentGoals?.dsa !== undefined ? parseFloat(settings.permanentGoals.dsa) : 3;

  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button 
          className="mobile-menu-btn" 
          onClick={toggleMenu}
          style={{ background: "transparent", border: "none", color: "var(--text-primary)", cursor: "pointer", display: "none" }}
        >
          <Menu size={24} />
        </button>
        <h1>
          <span style={{ color: "var(--accent)" }}>MISSION: {settings?.targetCompany || "Microsoft"}</span> 
        </h1>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        {/* Today's Focus Hours tracker quick widget */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--card-border)",
          padding: "0.4rem 0.8rem",
          borderRadius: "6px",
          fontSize: "0.85rem"
        }}>
          <Timer size={14} style={{ color: "var(--accent)" }} />
          <span style={{ color: "var(--text-secondary)" }}>Focus Today:</span>
          <span style={{ color: "#fff", fontWeight: 700 }}>{focusHours} hrs</span>
          {parseFloat(focusHours) >= dsaTarget && (
            <Award size={14} style={{ color: "var(--ms-green)" }} className="animate-pulse" />
          )}
        </div>

        {/* Live Clock & Date */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div className="topbar-date">{formatTime(time)}</div>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px", fontFamily: "var(--font-mono)" }}>
            {formatDate(time)}
          </span>
        </div>
      </div>
    </header>
  );
}