import { useState } from "react";
import { useApp } from "../context/AppContext";
import { 
  Trash2, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip
} from "recharts";

export default function Distractions() {
  const {
    distractions,
    setDistractions,
    timerSeconds,
    setTimerSeconds,
    timerIsRunning,
    setTimerIsRunning,
    timerMode,
    setTimerMode,
    timerOverrideLimit,
    setTimerOverrideLimit,
    presetMode,
    setPresetMode,
    PRESETS
  } = useApp();

  const todayStr = new Date().toLocaleDateString("en-CA");

  // Forms local states
  const [selectedSource, setSelectedSource] = useState("");
  const [wastedMins, setWastedMins] = useState(15);
  const [triggerDesc, setTriggerDesc] = useState("");

  // Presets
  const applyPreset = (mode) => {
    setTimerIsRunning(false);
    setTimerSeconds(0);
    setTimerMode("focus");
    setTimerOverrideLimit(null);
    setPresetMode(mode);
  };

  const handleSkip = () => {
    setTimerIsRunning(false);
    setTimerSeconds(0);
    setTimerMode("focus");
    setTimerOverrideLimit(null);
    if (presetMode === "pomodoro") {
    setPresetMode("deep");
    } else if (presetMode === "deep") {
    setPresetMode("intense");
    } else {
    setPresetMode("pomodoro");
    }
  };

  const logDistraction = (e) => {
    e.preventDefault();
    if (!triggerDesc.trim()) return;

    const entry = {
      id: "dist-" + Date.now(),
      date: todayStr,
      source: selectedSource.trim() || "Unknown",
      durationMinutes: parseInt(wastedMins, 10) || 5,
      trigger: triggerDesc.trim(),
      frequency: 1
    };

    setDistractions(prev => [entry, ...prev]);
    setTriggerDesc("");
    setSelectedSource("");
    alert(`Logged distraction: ${wastedMins} minutes wasted on ${entry.source.toUpperCase()}`);
  };

  const deleteDistraction = (id) => {
    if (window.confirm("Remove this log entry?")) {
      setDistractions(prev => prev.filter(d => d.id !== id));
    }
  };

  // --- Reports calculations ---
  const getReports = () => {
    // 1. Daily (Today)
    const dailyMinutes = distractions.filter(d => d.date === todayStr).reduce((sum, d) => sum + d.durationMinutes, 0);

    // 2. Weekly (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklyMinutes = distractions.filter(d => new Date(d.date) >= sevenDaysAgo).reduce((sum, d) => sum + d.durationMinutes, 0);

    // 3. Monthly (Last 30 Days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyMinutes = distractions.filter(d => new Date(d.date) >= thirtyDaysAgo).reduce((sum, d) => sum + d.durationMinutes, 0);

    // 4. Source breakdown
    const sourceSummary = {};
    distractions.forEach(d => {
      const src = (d.source || "Other").toLowerCase();
      if (!sourceSummary[src]) sourceSummary[src] = 0;
      sourceSummary[src] += d.durationMinutes;
    });

    const chartSourceData = Object.entries(sourceSummary).map(([name, mins]) => ({
      name: name.toUpperCase(),
      Minutes: mins
    })).sort((a, b) => b.Minutes - a.Minutes);

    return {
      dailyMinutes,
      weeklyMinutes,
      monthlyMinutes,
      chartSourceData
    };
  };

  const reports = getReports();
  
  const timerConfig=PRESETS[presetMode];
  // Pomodoro computations
  const activeLimitSecs = timerOverrideLimit !== null ? timerOverrideLimit : (timerConfig[timerMode] || 25 * 60);
  const timeRemaining = Math.max(0, activeLimitSecs - timerSeconds);
  const remainingMins = Math.floor(timeRemaining / 60) || 0;
  const remainingSecs = timeRemaining % 60 || 0;
  const progressRatio = timeRemaining / activeLimitSecs || 0;
  const circleRadius = 55;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference * (1 - progressRatio);

  const getSourceColor = (src) => {
    const s = String(src).toLowerCase();
    if (s.includes("youtube")) return "#ef4444";
    if (s.includes("reels") || s.includes("tiktok") || s.includes("shorts")) return "#ec4899";
    if (s.includes("game") || s.includes("gaming")) return "#a855f7";
    if (s.includes("porn") || s.includes("adult")) return "#f97316";
    if (s.includes("browse") || s.includes("browsing")) return "#3b82f6";
    
    // Generate a consistent pseudo-random color based on string
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = s.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Focus & Attention Controller</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            Log distractions to audit attention leakage, specify triggers, and control Pomodoro study intervals.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        
        {/* LEFT PANEL: Focus Timer & Distraction Log Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* POMODORO TIMER PANEL */}
          <div className="glass-card" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "1rem", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 130, height: 130, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                  <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff", fontFamily: "var(--font-mono)" }}>
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

            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "#fff", marginBottom: "2px" }}>Timer Presets</h3>
              <button onClick={() => applyPreset("pomodoro")} className="btn-secondary" style={{ padding: "0.4rem", fontSize: "0.75rem", textAlign: "left" }}>
                🍅 Standard Focus (25 min)
              </button>
              <button onClick={() => applyPreset("deep")} className="btn-secondary" style={{ padding: "0.4rem", fontSize: "0.75rem", textAlign: "left" }}>
                🚀 Deep Study Block (50 min)
              </button>
              <button onClick={() => applyPreset("intense")} className="btn-secondary" style={{ padding: "0.4rem", fontSize: "0.75rem", textAlign: "left" }}>
                🧠 High Intensity Session (90 min)
              </button>
            </div>
          </div>

          {/* DISTRACTION LOG FORM */}
          <div className="glass-card">
            <div className="glass-card-header">
              <h3>Log Attention Wasted</h3>
            </div>

            <form onSubmit={logDistraction} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "0.8rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Source Type</label>
                  <input 
                    type="text" 
                    list="distraction-sources"
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    placeholder="e.g. YouTube, Twitter, Gaming..."
                    required
                  />
                  <datalist id="distraction-sources">
                    <option value="YouTube" />
                    <option value="Reels / TikTok" />
                    <option value="Gaming" />
                    <option value="Adult Content" />
                    <option value="Web Browsing" />
                    <option value="Social Media" />
                    <option value="Daydreaming" />
                  </datalist>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Wasted Time (Minutes)</label>
                  <input 
                    type="number" 
                    value={wastedMins}
                    onChange={(e) => setWastedMins(parseInt(e.target.value, 10) || 5)}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>What triggered this distraction?</label>
                <input 
                  type="text"
                  value={triggerDesc}
                  onChange={(e) => setTriggerDesc(e.target.value)}
                  placeholder="e.g. Phone notifications / feeling stuck on stack problems"
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="btn-primary" style={{ padding: "0.45rem 1.25rem", fontSize: "0.8rem" }}>
                  Record Wasted Minutes
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT PANEL: Distraction reports & Timeline log */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* STATS & REPORTS */}
          <div className="glass-card" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#ef4444" }}>{reports.dailyMinutes}m</div>
              <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Today Wasted</div>
            </div>
            <div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff" }}>{reports.weeklyMinutes}m</div>
              <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>7-Day Total</div>
            </div>
            <div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff" }}>{reports.monthlyMinutes}m</div>
              <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>30-Day Total</div>
            </div>
          </div>

          {/* DISTRIBUTION BAR CHART */}
          <div className="glass-card" style={{ padding: "0.5rem" }}>
            <div className="glass-card-header" style={{ marginBottom: "4px" }}>
              <h3 style={{ fontSize: "0.8rem" }}>Source Time Wasted (Mins)</h3>
            </div>
            <div style={{ width: "100%", height: "130px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reports.chartSourceData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={8} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={8} tickLine={false} />
                  <ChartTooltip wrapperStyle={{ fontSize: 9 }} />
                  <Bar dataKey="Minutes" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CHRONOLOGICAL TIMELINE OF LOGS */}
          <div className="glass-card" style={{ maxHeight: "250px", overflowY: "auto" }}>
            <div className="glass-card-header">
              <h3>Reflection Audit Logs</h3>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {distractions.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "1rem", fontSize: "0.75rem" }}>
                  No distractions logged yet.
                </div>
              ) : (
                distractions.map(d => (
                  <div 
                    key={d.id}
                    style={{
                      background: "rgba(0,0,0,0.15)",
                      border: "1px solid rgba(255,255,255,0.02)",
                      borderRadius: "6px",
                      padding: "0.4rem",
                      fontSize: "0.7rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <span style={{ 
                          width: 6, 
                          height: 6, 
                          borderRadius: "50%", 
                          backgroundColor: getSourceColor(d.source) 
                        }}></span>
                        <strong style={{ color: "#fff", textTransform: "uppercase" }}>{d.source}</strong>
                        <span style={{ color: "#ef4444" }}>({d.durationMinutes} mins)</span>
                      </div>
                      <p style={{ color: "var(--text-secondary)", marginTop: "2px" }}>
                        Trigger: <span style={{ color: "var(--text-primary)" }}>{d.trigger}</span>
                      </p>
                    </div>

                    <button 
                      onClick={() => deleteDistraction(d.id)}
                      style={{ background: "transparent", color: "rgba(255,255,255,0.2)" }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
