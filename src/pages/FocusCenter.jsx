import { useState } from "react";
import { useApp } from "../context/AppContext";
import { 
  Timer, 
  Trash2, 
  Activity, 
  Zap, 
  Smartphone, 
  TrendingUp, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  VolumeX, 
  Plus 
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  Legend 
} from "recharts";

export default function FocusCenter() {
  const {
    focusSessions,
    setFocusSessions,
    distractions,
    setDistractions,
    timerSeconds,
    setTimerSeconds,
    timerIsRunning,
    setTimerIsRunning,
    timerMode,
    setTimerMode,
    timerConfig,
    setTimerConfig,
    todayFocusSeconds,
    setTodayFocusSeconds
  } = useApp();

  // Selected distraction quick values
  const [selectedSource, setSelectedSource] = useState("instagram");
  const [customMinutes, setCustomMinutes] = useState(15);
  
  // Custom manual session log
  const [manualSession, setManualSession] = useState({ date: new Date().toISOString().split("T")[0], mins: 60 });

  const todayStr = new Date().toISOString().split("T")[0];

  // --- Focus Session presets ---
  const applyPreset = (mins) => {
    setTimerIsRunning(false);
    setTimerSeconds(0);
    setTimerMode("focus");
    setTimerConfig(prev => ({ ...prev, focus: mins * 60 }));
  };

  // Skip Timer mode
  const handleSkip = () => {
    setTimerIsRunning(false);
    setTimerSeconds(0);
    setTimerMode(prev => prev === "focus" ? "short" : prev === "short" ? "long" : "focus");
  };

  // --- Accumulated Focus Statistics ---
  const getFocusStats = () => {
    const todaySeconds = focusSessions.filter(s => s.date === todayStr).reduce((sum, s) => sum + s.durationSeconds, 0);
    
    // Last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklySeconds = focusSessions.filter(s => new Date(s.date) >= sevenDaysAgo).reduce((sum, s) => sum + s.durationSeconds, 0);

    // Last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlySeconds = focusSessions.filter(s => new Date(s.date) >= thirtyDaysAgo).reduce((sum, s) => sum + s.durationSeconds, 0);

    return {
      today: (todaySeconds / 3600).toFixed(1),
      weekly: (weeklySeconds / 3600).toFixed(1),
      monthly: (monthlySeconds / 3600).toFixed(1)
    };
  };

  const focusStats = getFocusStats();

  // --- Distraction Statistics ---
  const getDistractionStats = () => {
    const todayMins = distractions.filter(d => d.date === todayStr).reduce((sum, d) => sum + d.durationMinutes, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklyMins = distractions.filter(d => new Date(d.date) >= sevenDaysAgo).reduce((sum, d) => sum + d.durationMinutes, 0);

    // Most common distraction source
    const counts = {};
    distractions.forEach(d => {
      counts[d.source] = (counts[d.source] || 0) + d.durationMinutes;
    });
    
    let common = "None";
    let maxMins = 0;
    Object.entries(counts).forEach(([source, mins]) => {
      if (mins > maxMins) {
        maxMins = mins;
        common = source;
      }
    });

    return {
      today: todayMins,
      weekly: weeklyMins,
      common: common.toUpperCase()
    };
  };

  const distractionStats = getDistractionStats();

  // --- Log manual focus session ---
  const handleLogManualSession = (e) => {
    e.preventDefault();
    const secs = manualSession.mins * 60;
    const log = {
      date: manualSession.date,
      durationSeconds: secs,
      mode: "focus"
    };

    setFocusSessions(prev => [...prev, log]);
    if (manualSession.date === todayStr) {
      setTodayFocusSeconds(s => s + secs);
    }
    alert(`Manually logged ${manualSession.mins} minutes focus session.`);
  };

  // --- Log Distraction handler ---
  const logDistraction = (source, mins) => {
    const log = {
      date: todayStr,
      source: source,
      durationMinutes: parseInt(mins, 10) || 5
    };

    setDistractions(prev => [...prev, log]);
  };

  const clearDistractions = () => {
    if (window.confirm("Delete all distraction logs?")) {
      setDistractions([]);
    }
  };

  // --- Charts Data: last 7 days focus vs distraction ---
  const getChartData = () => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      
      const focusSecs = focusSessions.filter(s => s.date === dateStr).reduce((sum, s) => sum + s.durationSeconds, 0);
      const distractMins = distractions.filter(d => d.date === dateStr).reduce((sum, d) => sum + d.durationMinutes, 0);

      data.push({
        name: d.toLocaleDateString([], { weekday: "short" }),
        FocusHrs: parseFloat((focusSecs / 3600).toFixed(1)),
        DistractMins: distractMins
      });
    }
    return data;
  };

  const chartData = getChartData();

  // Active limits display
  const activeLimitSecs = timerConfig[timerMode];
  const timeRemaining = Math.max(0, activeLimitSecs - timerSeconds);
  const remainingMins = Math.floor(timeRemaining / 60);
  const remainingSecs = timeRemaining % 60;
  const progressRatio = timeRemaining / activeLimitSecs;
  const circleRadius = 55;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference * (1 - progressRatio);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Focus & Auditing Center</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            Track deep work hours, configure focus intervals, and log daily distractions to gauge accountability.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        
        {/* FOCUS PANEL */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-card" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "1rem", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 140, height: 140, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }} viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r={circleRadius} style={{ fill: "none", stroke: "rgba(255,255,255,0.03)", strokeWidth: 5 }} />
                  <circle
                    cx="70"
                    cy="70"
                    r={circleRadius}
                    style={{
                      fill: "none",
                      stroke: "var(--accent)",
                      strokeWidth: 5,
                      strokeLinecap: "round",
                      transition: "stroke-dashoffset 0.35s"
                    }}
                    strokeDasharray={circleCircumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div style={{ position: "absolute", textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", fontFamily: "var(--font-mono)" }}>
                    {remainingMins.toString().padStart(2, "0")}:{remainingSecs.toString().padStart(2, "0")}
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    {timerMode === "focus" ? "FOCUS BLOCK" : "REST"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button onClick={() => setTimerIsRunning(!timerIsRunning)} className="timer-btn" style={{ width: 34, height: 34 }}>
                  {timerIsRunning ? <Pause size={12} /> : <Play size={12} />}
                </button>
                <button onClick={handleSkip} className="timer-btn" style={{ width: 34, height: 34 }}>
                  <ChevronRight size={12} />
                </button>
                <button onClick={() => { setTimerIsRunning(false); setTimerSeconds(0); }} className="timer-btn" style={{ width: 34, height: 34 }}>
                  <RotateCcw size={12} />
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.50rem" }}>
              <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "#fff" }}>Focus Presets</h3>
              <button onClick={() => applyPreset(25)} className="btn-secondary" style={{ padding: "0.4rem", fontSize: "0.75rem", textAlign: "left" }}>
                🍅 Standard Pomodoro (25 min)
              </button>
              <button onClick={() => applyPreset(50)} className="btn-secondary" style={{ padding: "0.4rem", fontSize: "0.75rem", textAlign: "left" }}>
                🚀 Deep Study Block (50 min)
              </button>
              <button onClick={() => applyPreset(90)} className="btn-secondary" style={{ padding: "0.4rem", fontSize: "0.75rem", textAlign: "left" }}>
                🧠 High Execution Session (90 min)
              </button>
            </div>
          </div>

          {/* FOCUS STATS */}
          <div className="glass-card" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)" }}>{focusStats.today}h</div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Today's Focus</div>
            </div>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff" }}>{focusStats.weekly}h</div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Weekly Focus</div>
            </div>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff" }}>{focusStats.monthly}h</div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Monthly Focus</div>
            </div>
          </div>

          {/* MANUAL STUDY LOG */}
          <div className="glass-card">
            <div className="glass-card-header">
              <h3>Manual Session Logger</h3>
            </div>
            <form onSubmit={handleLogManualSession} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "1rem", alignItems: "flex-end" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Date</label>
                <input 
                  type="date"
                  value={manualSession.date}
                  onChange={(e) => setManualSession({ ...manualSession, date: e.target.value })}
                  style={{ fontSize: "0.8rem", padding: "4px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Minutes</label>
                <input 
                  type="number"
                  value={manualSession.mins}
                  onChange={(e) => setManualSession({ ...manualSession, mins: parseInt(e.target.value, 10) || 0 })}
                  style={{ fontSize: "0.8rem", padding: "4px" }}
                  min="1"
                />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: "0.45rem", fontSize: "0.8rem", display: "flex", alignItems: "center", justifySelf: "stretch", justifyContent: "center", gap: "4px" }}>
                <Plus size={12} /> Log
              </button>
            </form>
          </div>
        </div>

        {/* DISTRACTION PANEL */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-card">
            <div className="glass-card-header">
              <h3>Distraction Audit Log</h3>
              <button onClick={clearDistractions} style={{ background: "transparent", color: "rgba(239, 68, 68, 0.4)" }}>
                <VolumeX size={14} />
              </button>
            </div>

            {/* Quick Trigger Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                {[
                  { id: "instagram", label: "Instagram", color: "#d946ef" },
                  { id: "youtube", label: "YouTube", color: "#ef4444" },
                  { id: "reels", label: "Shorts/Reels", color: "#ec4899" },
                  { id: "gaming", label: "Gaming", color: "#a855f7" },
                  { id: "browsing", label: "Browsing", color: "#3b82f6" },
                  { id: "other", label: "Other", color: "#94a3b8" }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedSource(item.id)}
                    className="btn-secondary"
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.5rem",
                      border: selectedSource === item.id ? `1.5px solid ${item.color}` : "1px solid var(--card-border)",
                      color: selectedSource === item.id ? "#fff" : "var(--text-secondary)",
                      background: selectedSource === item.id ? `${item.color}10` : "rgba(255,255,255,0.02)"
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Time triggers */}
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "0.75rem" }}>
                {[5, 15, 30].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      logDistraction(selectedSource, mins);
                      alert(`Logged ${mins} mins distraction on ${selectedSource}.`);
                    }}
                    className="btn-secondary"
                    style={{ fontSize: "0.75rem", padding: "0.35rem 0.6rem", flex: 1 }}
                  >
                    +{mins} Min
                  </button>
                ))}
              </div>

              {/* Custom trigger */}
              <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <input 
                  type="number"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(parseInt(e.target.value, 10) || 0)}
                  style={{ fontSize: "0.75rem", padding: "4px", width: "70px", textAlign: "center" }}
                  placeholder="Mins"
                />
                <button 
                  type="button"
                  onClick={() => {
                    logDistraction(selectedSource, customMinutes);
                    alert(`Logged ${customMinutes} mins distraction on ${selectedSource}.`);
                  }}
                  className="btn-primary" 
                  style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem", flex: 1 }}
                >
                  Log Custom Distraction
                </button>
              </div>
            </div>
          </div>

          {/* DISTRACTION STATS */}
          <div className="glass-card" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ef4444" }}>{distractionStats.today}m</div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Today</div>
            </div>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff" }}>{distractionStats.weekly}m</div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Weekly Limit</div>
            </div>
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#ffb900", height: "2.25rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {distractionStats.common}
              </div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Primary Source</div>
            </div>
          </div>
        </div>

      </div>

      {/* CHARTS GRAPH COMPONENT */}
      <div className="glass-card">
        <div className="glass-card-header">
          <h3>
            <Activity size={16} style={{ color: "var(--accent)", marginRight: "4px" }} />
            <span>Weekly Execution Audit: Focus Hours vs Distraction Minutes</span>
          </h3>
        </div>
        <div style={{ width: "100%", height: "260px", marginTop: "1rem" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <ChartTooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="FocusHrs" name="Focus Blocks (Hours)" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="DistractMins" name="Distractions (Minutes)" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
