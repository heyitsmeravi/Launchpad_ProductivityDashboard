import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Rocket, Target, Play, Pause, CheckCircle, Flame, Star, Trophy, Clock, FileText } from "lucide-react";

export default function ExecutionCenter() {
  const {
    goals,
    setGoals,
    dailyPlans,
    setDailyPlans,
    tracks,
    activityLogs,
    settings,
    todayGoalsChecked,
    setTodayGoalsChecked,
    todayMission,
    setTodayMission,
    currentFocusTask,
    setCurrentFocusTask,
    dailyScoreHistory,
    setDailyScoreHistory,
    dailyReflections,
    setDailyReflections,
    timerSeconds,
    timerIsRunning,
    setTimerIsRunning,
    timerMode,
    setTimerMode,
    setTimerSeconds,
    timerConfig,
    setTodayFocusSeconds
  } = useApp();

  const todayStr = new Date().toISOString().split("T")[0];

  // --- 1. Today's Mission Logic ---
  const todayPlans = dailyPlans[todayStr] || [];
  
  const permGoalsMap = {
    dsa: `${settings?.pillar1Name || "DSA"} Target`,
    development: `${settings?.pillar2Name || "Development"} Target`,
    learning: "Learning/Course Target",
    reading: "Reading Target",
    exercise: "Exercise Target"
  };

  const permGoalTasks = Object.keys(permGoalsMap).map(key => ({
    id: `perm-${key}`,
    title: permGoalsMap[key],
    type: "permanent",
    completed: todayGoalsChecked[key]
  }));
  
  const allPossibleTasks = [
    ...goals.filter(g => g.category === "daily").map(g => ({ id: g.id, title: g.title, type: "goal", completed: g.completed })),
    ...todayPlans.map(p => ({ id: p.id, title: `${p.label} (${p.start})`, type: "plan", completed: p.completed })),
    ...permGoalTasks
  ];

  const missionTasks = allPossibleTasks.filter(t => todayMission.includes(t.id));
  const completedMissionCount = missionTasks.filter(g => g.completed).length;
  const dailyGoalCandidates = allPossibleTasks.filter(t => !t.completed && !todayMission.includes(t.id));

  const toggleMissionSelection = (goalId) => {
    setTodayMission(prev => {
      if (prev.includes(goalId)) {
        return prev.filter(id => id !== goalId);
      } else {
        if (prev.length >= 3) return prev;
        return [...prev, goalId];
      }
    });
  };

  const markGoalComplete = (task) => {
    if (task.type === "plan") {
      setDailyPlans(prev => {
        const plans = prev[todayStr] || [];
        return {
          ...prev,
          [todayStr]: plans.map(p => p.id === task.id ? { ...p, completed: true } : p)
        };
      });
    } else if (task.type === "permanent") {
      const key = task.id.replace("perm-", "");
      setTodayGoalsChecked(prev => ({ ...prev, [key]: true }));
    } else {
      setGoals(prev => prev.map(g => g.id === task.id ? { ...g, completed: true } : g));
    }
    
    if (currentFocusTask === task.id) {
      setCurrentFocusTask(null);
      setTimerIsRunning(false);
    }
  };

  // --- 2. Current Focus Logic ---
  const activeFocusGoal = allPossibleTasks.find(t => t.id === currentFocusTask);
  const limit = timerConfig[timerMode] || 25 * 60;
  const remainingSeconds = Math.max(0, limit - timerSeconds);
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;

  const startFocus = (goalId) => {
    setCurrentFocusTask(goalId);
    setTimerMode("focus");
    setTimerIsRunning(true);
  };

  // --- 3. Daily Score Logic ---
  const calculateTodayScore = () => {
    let score = 0;
    const todayActs = activityLogs.filter(a => a.date === todayStr);
    
    todayActs.forEach(act => {
      if (act.desc.toLowerCase().includes("workout") || act.desc.toLowerCase().includes("exercise")) {
        score += 20;
      } else if (act.desc.toLowerCase().includes("daily target") || act.desc.toLowerCase().includes("habit")) {
        score += 25;
      } else if (act.trackId) {
        const track = tracks.find(t => t.id === act.trackId);
        if (track) {
          if (track.category === "dsa") score += 30;
          else if (track.category === "project") score += 15;
          else if (track.category === "book") score += 10;
          else score += 15; // default for course/playlist
        }
      } else {
        score += 10; // generic activity
      }
    });

    // Bonus for completing mission tasks
    score += completedMissionCount * 10;

    return Math.min(100, score); // Cap at 100
  };

  const todayScore = calculateTodayScore();
  
  useEffect(() => {
    setDailyScoreHistory(prev => ({
      ...prev,
      [todayStr]: todayScore
    }));
  }, [todayScore, todayStr, setDailyScoreHistory]);

  const getRank = (score) => {
    if (score < 40) return { label: "Needs Work", color: "#f25022" };
    if (score < 60) return { label: "Fair", color: "#ffb900" };
    if (score < 80) return { label: "Good", color: "#00a2ed" };
    return { label: "Excellent", color: "#7fba00" };
  };

  const rank = getRank(todayScore);

  // --- 4. Daily Reflection Logic ---
  const todayReflection = dailyReflections.find(r => r.date === todayStr) || { well: "", distracted: "", tomorrow: "" };
  const [refWell, setRefWell] = useState(todayReflection.well);
  const [refDist, setRefDist] = useState(todayReflection.distracted);
  const [refTom, setRefTom] = useState(todayReflection.tomorrow);

  const saveReflection = () => {
    const updated = {
      id: `ref-${todayStr}`,
      date: todayStr,
      well: refWell.substring(0, 200),
      distracted: refDist.substring(0, 200),
      tomorrow: refTom.substring(0, 200)
    };
    setDailyReflections(prev => {
      const filtered = prev.filter(r => r.date !== todayStr);
      return [updated, ...filtered];
    });
    alert("Reflection saved securely.");
  };

  // --- 5. Focus Hours Widget Logic ---
  const todayFocusSecs = activityLogs
    .filter(s => s.date === todayStr && s.mode === "focus")
    .reduce((sum, s) => sum + (s.durationMinutes * 60), 0);

  const last7DaysSecs = activityLogs
    .filter(s => {
      const d = new Date(s.date);
      const diff = (new Date() - d) / (1000 * 60 * 60 * 24);
      return diff <= 7 && s.mode === "focus";
    })
    .reduce((sum, s) => sum + (s.durationMinutes * 60), 0);

  const weeklyAvgSecs = last7DaysSecs / 7;

  return (
    <div className="page-container" style={{ maxWidth: "1400px" }}>
      <div className="page-header">
        <div>
          <h2>Execution Center</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            Convert your plans into daily action. Select your mission and execute.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Section 1: Today's Mission */}
          <div className="glass-card">
            <div className="glass-card-header">
              <h3><Target size={16} /> Today's Mission</h3>
              <span style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: "bold" }}>
                {completedMissionCount} / {todayMission.length}
              </span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {missionTasks.length === 0 && (
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", padding: "0.5rem 0" }}>
                  No mission selected. Choose up to 3 tasks below.
                </div>
              )}
              
              {missionTasks.map(task => (
                <div key={task.id} style={{ 
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: task.completed ? "rgba(127, 186, 0, 0.1)" : "rgba(255,255,255,0.03)",
                  padding: "0.75rem", borderRadius: "8px", border: `1px solid ${task.completed ? "rgba(127, 186, 0, 0.3)" : "rgba(255,255,255,0.05)"}`
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button onClick={() => markGoalComplete(task)} style={{
                      background: "transparent", border: "none", color: task.completed ? "#7fba00" : "var(--text-muted)", cursor: "pointer"
                    }}>
                      <CheckCircle size={18} />
                    </button>
                    <span style={{ textDecoration: task.completed ? "line-through" : "none", color: task.completed ? "var(--text-muted)" : "#fff", fontSize: "0.9rem" }}>
                      {task.title}
                    </span>
                  </div>
                  
                  {!task.completed && (
                    <button 
                      onClick={() => startFocus(task.id)}
                      className="btn-primary" 
                      style={{ padding: "4px 8px", fontSize: "0.75rem", display: "flex", gap: "4px", alignItems: "center" }}
                    >
                      <Play size={10} /> Focus
                    </button>
                  )}
                </div>
              ))}
            </div>

            {todayMission.length < 3 && dailyGoalCandidates.length > 0 && (
              <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--card-border)", paddingTop: "1rem" }}>
                <h4 style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Available Daily Goals:</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {dailyGoalCandidates.filter(g => !todayMission.includes(g.id)).map(g => (
                    <div key={g.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", padding: "0.4rem", background: "rgba(0,0,0,0.2)", borderRadius: "4px" }}>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "80%" }}>{g.title}</span>
                      <button onClick={() => toggleMissionSelection(g.id)} style={{ color: "var(--accent)", background: "transparent", fontWeight: "bold" }}>+ Add</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Current Focus */}
          <div className="glass-card" style={{ borderLeft: activeFocusGoal ? "4px solid var(--accent)" : "1px solid var(--card-border)" }}>
            <div className="glass-card-header">
              <h3><Rocket size={16} /> Current Focus</h3>
            </div>
            
            {activeFocusGoal ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", padding: "1rem 0" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: "bold", textAlign: "center", color: "#fff" }}>
                  {activeFocusGoal.title}
                </div>
                
                <div style={{ fontSize: "3rem", fontWeight: "900", fontFamily: "var(--font-mono)", color: "var(--accent)", textShadow: "0 0 20px rgba(var(--accent-rgb), 0.4)" }}>
                  {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
                </div>
                
                <div style={{ display: "flex", gap: "1rem" }}>
                  <button onClick={() => setTimerIsRunning(!timerIsRunning)} className="btn-secondary" style={{ display: "flex", gap: "0.5rem", alignItems: "center", padding: "0.5rem 1.5rem" }}>
                    {timerIsRunning ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}
                  </button>
                  <button onClick={() => markGoalComplete(activeFocusGoal)} className="btn-primary" style={{ display: "flex", gap: "0.5rem", alignItems: "center", padding: "0.5rem 1.5rem", background: "#7fba00", color: "#fff" }}>
                    <CheckCircle size={14} /> Complete
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 0", fontSize: "0.9rem" }}>
                No active focus. Select a task from Today's Mission to start.
              </div>
            )}
          </div>
          
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Section 3: Daily Score */}
          <div className="glass-card">
            <div className="glass-card-header">
              <h3><Trophy size={16} /> Daily Score</h3>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0" }}>
              <div>
                <div style={{ fontSize: "3.5rem", fontWeight: "900", color: rank.color, lineHeight: "1" }}>
                  {todayScore}
                </div>
                <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "4px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>
                  Rank: <span style={{ color: rank.color }}>{rank.label}</span>
                </div>
              </div>
              
              <div style={{ width: "100px", height: "100px", position: "relative" }}>
                <svg viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke={rank.color} strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - (283 * todayScore) / 100} style={{ transition: "all 1s ease-out" }} />
                </svg>
                <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "bold" }}>
                  {todayScore}%
                </div>
              </div>
            </div>
          </div>

          {/* Focus Hours Widget */}
          <div className="glass-card">
            <div className="glass-card-header">
              <h3><Clock size={16} /> Focus Time Analytics</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Today</div>
                <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--accent)" }}>
                  {Math.floor(todayFocusSecs / 3600)}h {Math.floor((todayFocusSecs % 3600) / 60)}m
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Weekly Average</div>
                <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#a855f7" }}>
                  {Math.floor(weeklyAvgSecs / 3600)}h {Math.floor((weeklyAvgSecs % 3600) / 60)}m
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Daily Reflection */}
          <div className="glass-card">
            <div className="glass-card-header">
              <h3><FileText size={16} /> Daily Reflection</h3>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>What went well today?</label>
                <input type="text" value={refWell} onChange={e => setRefWell(e.target.value)} maxLength={200} placeholder="I completed my DSA problems without checking solutions." />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>What distracted me today?</label>
                <input type="text" value={refDist} onChange={e => setRefDist(e.target.value)} maxLength={200} placeholder="I spent too much time on YouTube." />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>What is tomorrow's priority?</label>
                <input type="text" value={refTom} onChange={e => setRefTom(e.target.value)} maxLength={200} placeholder="Build the navbar component." />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button onClick={saveReflection} className="btn-primary" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <CheckCircle size={14} /> Save Check-In
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
