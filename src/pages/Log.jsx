import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Calendar, Plus, BookOpen, AlertCircle, Sparkles, CheckSquare, Smile, Zap, TrendingUp, HelpCircle } from "lucide-react";

export default function Log() {
  const { logs, setLogs, focusSessions, distractions, dsaProblems } = useApp();
  
  // Tab states: daily, weekly
  const [activeTab, setActiveTab] = useState("daily");
  
  // Local Form state
  const [showForm, setShowForm] = useState(false);
  const [newLog, setNewLog] = useState({
    date: new Date().toISOString().split("T")[0],
    studyDurationMinutes: 240,
    notes: "",
    achievements: "",
    distractions: "",
    mood: "🙂",
    energy: 4,
    focus: 4,
    productivity: 4,
    biggestDistraction: "none",
    keyLearning: ""
  });

  const handleAddLog = (e) => {
    e.preventDefault();
    if (!newLog.date) return;

    const dateExistsIndex = logs.findIndex(l => l.date === newLog.date);

    const logEntry = {
      date: newLog.date,
      studyDurationMinutes: parseInt(newLog.studyDurationMinutes, 10) || 0,
      notes: newLog.notes.trim(),
      achievements: newLog.achievements.trim(),
      distractions: newLog.distractions.trim(),
      mood: newLog.mood,
      energy: parseInt(newLog.energy, 10),
      focus: parseInt(newLog.focus, 10),
      productivity: parseInt(newLog.productivity, 10),
      biggestDistraction: newLog.biggestDistraction,
      keyLearning: newLog.keyLearning.trim()
    };

    if (dateExistsIndex !== -1) {
      if (window.confirm(`An entry already exists for ${newLog.date}. Do you want to overwrite it?`)) {
        setLogs(prev => {
          const updated = [...prev];
          updated[dateExistsIndex] = logEntry;
          return updated;
        });
      } else {
        return;
      }
    } else {
      setLogs(prev => [logEntry, ...prev]);
    }

    setNewLog({
      date: new Date().toISOString().split("T")[0],
      studyDurationMinutes: 240,
      notes: "",
      achievements: "",
      distractions: "",
      mood: "🙂",
      energy: 4,
      focus: 4,
      productivity: 4,
      biggestDistraction: "none",
      keyLearning: ""
    });
    setShowForm(false);
  };

  // --- Dynamic Weekly Review Calculation ---
  // Aggregates data for the last 7 days starting from selected date (defaulting to current date)
  const getWeeklyReviewStats = () => {
    const today = new Date();
    const last7DaysLogs = [];
    const datesList = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      datesList.push(dateStr);
      
      const dayLog = logs.find(l => l.date === dateStr);
      if (dayLog) {
        last7DaysLogs.push(dayLog);
      }
    }

    // A. Focus hours sum
    const totalFocusSecs = focusSessions
      .filter(s => datesList.includes(s.date) && s.mode === "focus")
      .reduce((sum, s) => sum + s.durationSeconds, 0);
    const focusHours = (totalFocusSecs / 3600).toFixed(1);

    // B. DSA Solves sum
    const solvedDsaCount = dsaProblems
      .filter(p => datesList.includes(p.solvedAt))
      .length;

    // C. Distraction hours sum
    const totalDistractMins = distractions
      .filter(d => datesList.includes(d.date))
      .reduce((sum, d) => sum + d.durationMinutes, 0);
    const distractionHours = (totalDistractMins / 60).toFixed(1);

    // D. Category Hours Splits (computed from daily planner checks or standard splits)
    // For simplicity, let's estimate Dev and Learn from focus times mapped to planner blocks
    const studyHoursEstimate = (parseFloat(focusHours) * 0.4).toFixed(1);
    const devHoursEstimate = (parseFloat(focusHours) * 0.4).toFixed(1);
    const learningHoursEstimate = (parseFloat(focusHours) * 0.2).toFixed(1);

    // E. Most productive day vs Least productive day
    let mostProductiveDay = "None";
    let highestFocus = 0;
    let leastProductiveDay = "None";
    let lowestFocus = 999;

    datesList.forEach(dateStr => {
      const dayFocus = focusSessions
        .filter(s => s.date === dateStr && s.mode === "focus")
        .reduce((sum, s) => sum + s.durationSeconds, 0) / 3600;
      
      const dayName = new Date(dateStr).toLocaleDateString([], { weekday: "long" });

      if (dayFocus > highestFocus) {
        highestFocus = dayFocus;
        mostProductiveDay = `${dayName} (${dayFocus.toFixed(1)}h)`;
      }

      if (dayFocus < lowestFocus) {
        lowestFocus = dayFocus;
        leastProductiveDay = `${dayName} (${dayFocus.toFixed(1)}h)`;
      }
    });

    if (mostProductiveDay === "None") mostProductiveDay = "No focus logged yet";
    if (leastProductiveDay === "None" || lowestFocus === 999) leastProductiveDay = "No focus logged yet";

    // F. Recommendations engine
    let recommendation = "Execution stats excellent. Focus streaks are high. Keep maintaining early review templates.";
    if (parseFloat(distractionHours) > 3) {
      recommendation = "⚠ Distraction audit warning: Social media browsing exceeded 3 hours this week. Recommend locking phone inside focus blocks next week.";
    } else if (parseFloat(focusHours) < 12) {
      recommendation = "⚠ Focus hours target warning: Total deep study fell below 12 hours this week. Try scheduling template plans daily at 09:00 AM.";
    }

    return {
      focusHours,
      solvedDsaCount,
      devHours: devHoursEstimate,
      learningHours: learningHoursEstimate,
      distractionHours,
      mostProductiveDay,
      leastProductiveDay,
      recommendation
    };
  };

  const weeklyReview = getWeeklyReviewStats();
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Daily Log & Weekly Reviews</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            Submit daily execution logs, audit energy/focus levels, and review automatically generated Sunday audits.
          </p>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
        <button
          onClick={() => setActiveTab("daily")}
          className="btn-secondary"
          style={{
            background: activeTab === "daily" ? "rgba(var(--accent-rgb), 0.12)" : "rgba(255,255,255,0.03)",
            borderColor: activeTab === "daily" ? "var(--accent)" : "var(--card-border)",
            color: activeTab === "daily" ? "#fff" : "var(--text-secondary)",
            padding: "0.4rem 1.25rem",
            fontSize: "0.8rem"
          }}
        >
          📝 Daily Logs & reflections
        </button>
        <button
          onClick={() => setActiveTab("weekly")}
          className="btn-secondary"
          style={{
            background: activeTab === "weekly" ? "rgba(var(--accent-rgb), 0.12)" : "rgba(255,255,255,0.03)",
            borderColor: activeTab === "weekly" ? "var(--accent)" : "var(--card-border)",
            color: activeTab === "weekly" ? "#fff" : "var(--text-secondary)",
            padding: "0.4rem 1.25rem",
            fontSize: "0.8rem"
          }}
        >
          📊 Sunday Weekly Reviews
        </button>
      </div>

      {activeTab === "daily" ? (
        <>
          {/* Daily Logs Tab */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
            <button 
              onClick={() => setShowForm(!showForm)} 
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <Plus size={14} />
              <span>Create Daily entry</span>
            </button>
          </div>

          {/* Daily log log form */}
          {showForm && (
            <form onSubmit={handleAddLog} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", borderLeft: "4px solid var(--accent)" }}>
              <div className="glass-card-header">
                <h3>Submit Daily Reflections Log</h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Date</label>
                  <input 
                    type="date"
                    value={newLog.date}
                    onChange={(e) => setNewLog({ ...newLog, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Daily Study Minutes</label>
                  <input 
                    type="number"
                    value={newLog.studyDurationMinutes}
                    onChange={(e) => setNewLog({ ...newLog, studyDurationMinutes: e.target.value })}
                    placeholder="240"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Mood Emoji</label>
                  <select 
                    value={newLog.mood}
                    onChange={(e) => setNewLog({ ...newLog, mood: e.target.value })}
                  >
                    <option value="😀">😀 Happy / Productive</option>
                    <option value="🙂">🙂 Good / Normal</option>
                    <option value="😐">😐 Tired / Neutral</option>
                    <option value="😔">😔 Distracted</option>
                    <option value="😫">😫 Stressed / Burnout</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Energy Rating (1-5)</label>
                  <select value={newLog.energy} onChange={(e) => setNewLog({ ...newLog, energy: e.target.value })}>
                    <option value="5">⚡⚡⚡⚡⚡ High Energy (5)</option>
                    <option value="4">⚡⚡⚡⚡ Normal Plus (4)</option>
                    <option value="3">⚡⚡⚡ Normal (3)</option>
                    <option value="2">⚡⚡ Low (2)</option>
                    <option value="1">⚡ Fatigue (1)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Focus Rating (1-5)</label>
                  <select value={newLog.focus} onChange={(e) => setNewLog({ ...newLog, focus: e.target.value })}>
                    <option value="5">🎯🎯🎯🎯🎯 Deep Focus (5)</option>
                    <option value="4">🎯🎯🎯🎯 Normal Plus (4)</option>
                    <option value="3">🎯🎯🎯 Average (3)</option>
                    <option value="2">🎯🎯 Sidetracked (2)</option>
                    <option value="1">🎯 Chaos (1)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Productivity Rating (1-5)</label>
                  <select value={newLog.productivity} onChange={(e) => setNewLog({ ...newLog, productivity: e.target.value })}>
                    <option value="5">🔥🔥🔥🔥🔥 High Output (5)</option>
                    <option value="4">🔥🔥🔥🔥 Good output (4)</option>
                    <option value="3">🔥🔥🔥 Normal (3)</option>
                    <option value="2">🔥🔥 Minimal (2)</option>
                    <option value="1">🔥 Zero Day (1)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Key Learning Today</label>
                  <input 
                    type="text"
                    value={newLog.keyLearning}
                    onChange={(e) => setNewLog({ ...newLog, keyLearning: e.target.value })}
                    placeholder="e.g. Learned how to parse XLSX with SheetJS."
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Biggest Distraction Logged</label>
                  <select value={newLog.biggestDistraction} onChange={(e) => setNewLog({ ...newLog, biggestDistraction: e.target.value })}>
                    <option value="none">None - No distractions</option>
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube</option>
                    <option value="reels">Reels / Shorts</option>
                    <option value="gaming">Gaming</option>
                    <option value="browsing">Random Web Browsing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Key achievements</label>
                  <textarea 
                    value={newLog.achievements}
                    onChange={(e) => setNewLog({ ...newLog, achievements: e.target.value })}
                    style={{ height: "60px", resize: "none" }}
                    placeholder="Solved 3 array problems..."
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Reflections / Notes</label>
                  <textarea 
                    value={newLog.notes}
                    onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })}
                    style={{ height: "60px", resize: "none" }}
                    placeholder="Reflect on today's goals..."
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Log Day</button>
              </div>
            </form>
          )}

          {/* Chronological logs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {sortedLogs.map((log) => (
              <div 
                key={log.date}
                className="glass-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  borderLeft: `3px solid ${log.studyDurationMinutes >= 240 ? "var(--accent)" : "rgba(255,255,255,0.06)"}`
                }}
              >
                {/* Header info */}
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "0.25rem", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Calendar size={12} style={{ color: "var(--accent)" }} />
                    <span style={{ fontWeight: 800, color: "#fff" }}>{log.date}</span>
                    <span style={{ fontSize: "1rem" }}>{log.mood}</span>
                  </div>
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    <span>⚡ Energy: <strong>{log.energy}/5</strong></span>
                    <span>🎯 Focus: <strong>{log.focus}/5</strong></span>
                    <span>🔥 Prod: <strong>{log.productivity}/5</strong></span>
                  </div>
                </div>

                {/* Achievements */}
                {log.achievements && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", color: "#7fba00", textTransform: "uppercase", fontWeight: 700 }}>
                      <Sparkles size={8} /> Achievements
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-primary)" }}>{log.achievements}</p>
                  </div>
                )}

                {/* Key learnings */}
                {log.keyLearning && (
                  <div>
                    <span style={{ fontSize: "0.7rem", color: "var(--accent)", fontWeight: 700, textTransform: "uppercase" }}>📖 Key takeaway</span>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>"{log.keyLearning}"</p>
                  </div>
                )}

                {/* Distractions */}
                {log.biggestDistraction && log.biggestDistraction !== "none" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", color: "#f25022" }}>
                    <AlertCircle size={10} />
                    <span>Biggest Distraction: <strong>{log.biggestDistraction.toUpperCase()}</strong></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Weekly Audits Tab */
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-card" style={{ borderLeft: "4px solid var(--accent)" }}>
            <div className="glass-card-header">
              <h3>
                <Sparkles size={16} style={{ color: "var(--accent)", marginRight: "4px" }} />
                <span>Auto-Generated Weekly Sunday Review</span>
              </h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", textAlign: "center", margin: "1.5rem 0" }}>
              <div style={{ background: "rgba(0,0,0,0.15)", padding: "0.75rem", borderRadius: "8px" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)" }}>{weeklyReview.focusHours}h</div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Focus Hours</div>
              </div>
              <div style={{ background: "rgba(0,0,0,0.15)", padding: "0.75rem", borderRadius: "8px" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#7fba00" }}>{weeklyReview.solvedDsaCount}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>DSA Solved</div>
              </div>
              <div style={{ background: "rgba(0,0,0,0.15)", padding: "0.75rem", borderRadius: "8px" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#a855f7" }}>{weeklyReview.devHours}h</div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Dev Hours</div>
              </div>
              <div style={{ background: "rgba(0,0,0,0.15)", padding: "0.75rem", borderRadius: "8px" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ffb900" }}>{weeklyReview.learningHours}h</div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Learn Hours</div>
              </div>
              <div style={{ background: "rgba(0,0,0,0.15)", padding: "0.75rem", borderRadius: "8px" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ef4444" }}>{weeklyReview.distractionHours}h</div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Distractions</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "1rem" }}>
              <div style={{ fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Most Productive day:</span>
                <div style={{ color: "#7fba00", fontWeight: "bold", fontSize: "0.95rem", marginTop: "2px" }}>{weeklyReview.mostProductiveDay}</div>
              </div>
              <div style={{ fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Least Productive day:</span>
                <div style={{ color: "#f25022", fontWeight: "bold", fontSize: "0.95rem", marginTop: "2px" }}>{weeklyReview.leastProductiveDay}</div>
              </div>
            </div>

            <div style={{
              marginTop: "1.5rem",
              background: "rgba(var(--accent-rgb), 0.05)",
              border: "1px solid rgba(var(--accent-rgb), 0.25)",
              borderRadius: "8px",
              padding: "1rem",
              fontSize: "0.85rem",
              lineHeight: "1.5"
            }}>
              <div style={{ fontWeight: "bold", color: "#fff", display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
                <Sparkles size={14} style={{ color: "var(--accent)" }} />
                <span>Advisor Recommendations</span>
              </div>
              <p style={{ color: "var(--text-secondary)" }}>{weeklyReview.recommendation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}