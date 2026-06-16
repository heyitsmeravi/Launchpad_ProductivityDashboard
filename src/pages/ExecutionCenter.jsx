import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Rocket, Target, Play, Pause, CheckCircle, Star, Trophy, Clock, FileText } from "lucide-react";

export default function ExecutionCenter() {
  const {
    goals,
    setGoals,
    dailyPlans,
    setDailyPlans,
    tracks,
    activityLogs,
    setActivityLogs,
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
    todayPermanentProgress,
    setTodayPermanentProgress,
    timerOverrideLimit,
    setTimerOverrideLimit,
    setTracks,
    todayFocusSeconds,
    activeFocusSession,
    finishFocusSessionEarly
  } = useApp();
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionData, setCompletionData] = useState({
    taskId: null,
    confidence: 0,
    notes: "",
    keyTakeaway: "",
    timeSpentMins: 0,
    logAsStudy: false
  });

  const todayStr = new Date().toLocaleDateString("en-CA");

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
    title: todayGoalsChecked[key] ? `✓ ${permGoalsMap[key]}` : permGoalsMap[key],
    type: "permanent",
    completed: todayGoalsChecked[key]
  }));
  
  const allPossibleTasks = [
    ...goals.map(g => ({ id: g.id, title: g.completed ? `✓ ${g.title}` : g.title, type: "goal", completed: g.completed })),
    ...todayPlans.map(p => ({ id: p.id, title: p.completed ? `✓ ${p.label} (${p.start})` : `${p.label} (${p.start})`, type: "plan", completed: p.completed, sourceId: p.sourceId })),
    ...permGoalTasks
  ];

  const missionTasks = allPossibleTasks.filter(t => todayMission.includes(t.id));
  const completedMissionCount = missionTasks.filter(g => g.completed).length;
  const activeMissionCount = missionTasks.length - completedMissionCount;
  const dailyGoalCandidates = allPossibleTasks.filter(t => !todayMission.includes(t.id));

  const toggleMissionSelection = (goalId) => {
    setTodayMission(prev => {
      if (prev.includes(goalId)) {
        return prev.filter(id => id !== goalId);
      } else {
        if (activeMissionCount >= 3) return prev;
        return [...prev, goalId];
      }
    });
  };

  const getPermanentTarget = (key) => {
    const isOddDay = new Date().getDate() % 2 !== 0;
    switch(key) {
      case "dsa": 
        const baseDsa = settings?.permanentGoals?.dsa || 0;
        return settings?.oddEvenMode 
          ? Math.round(baseDsa * (isOddDay ? 1.2 : 0.6) * 60)
          : Math.round(baseDsa * 60);
      case "development": 
        const baseDev = settings?.permanentGoals?.development || 0;
        return settings?.oddEvenMode 
          ? Math.round(baseDev * (isOddDay ? 0.5 : 1.5) * 60)
          : Math.round(baseDev * 60);
      case "learning": return Math.round((settings?.permanentGoals?.learning || 0) * 60);
      case "reading": return Math.round((settings?.permanentGoals?.reading || 0) * 2);
      case "exercise": return Math.round((settings?.permanentGoals?.exercise || 0));
      default: return 0;
    }
  };

  const markGoalComplete = (task, timeSpentMinsOverride = null) => {
    const timeSpent = timeSpentMinsOverride !== null ? timeSpentMinsOverride : 0;

    if (task.type === "plan" && task.sourceId && task.sourceId.includes("::")) {
      setCompletionData({
        task: task,
        confidence: 0,
        notes: "",
        keyTakeaway: "",
        timeSpentMins: timeSpent,
        logAsStudy: timeSpent === 0 // Defaults to true ONLY if they didn't use the timer
      });
      setShowCompletionModal(true);
      return;
    }

    if (task.type === "permanent") {
      const key = task.id.replace("perm-", "");
      const target = getPermanentTarget(key);
      const newProgress = (todayPermanentProgress[key] || 0) + timeSpent;
      
      setTodayPermanentProgress(prev => ({
        ...prev,
        [key]: newProgress
      }));

      // Only auto-log permanent goal time if it wasn't already tracked by the background timer!
      if (timeSpent > 0 && timeSpentMinsOverride === null) {
        const act = {
          id: `act-${Date.now()}`,
          taskId: task.id,
          date: todayStr,
          durationMinutes: timeSpent,
          desc: `Logged ${timeSpent}m on ${task.title}`,
          mode: "task"
        };
        setActivityLogs(prev => [...prev, act]);
      }

      if (target > 0 && newProgress < target) {
        if (currentFocusTask === task.id) {
          setCurrentFocusTask(null);
          setTimerIsRunning(false);
        }
        return;
      }
    }
    
    executeCompletion(task);
  };

  const executeCompletion = (task) => {
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

  const handleModalSubmit = (e) => {
    e.preventDefault();
    const task = completionData.task;
    const [trackId, itemId] = task.sourceId.split("::");

    let isTaskFullyComplete = false;

    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const updatedTasks = t.tasks.map(item => {
          if (item.id === itemId) {
            const target = item.targetTimeMins || 0;
            const newTimeSpent = (item.timeSpentMins || 0) + parseInt(completionData.timeSpentMins, 10);
            const isNowComplete = target === 0 || newTimeSpent >= target;
            isTaskFullyComplete = isNowComplete;

            return {
              ...item,
              status: isNowComplete ? (t.category === "dsa" ? "Solved" : "Completed") : item.status,
              confidence: completionData.confidence || item.confidence,
              notes: completionData.notes || item.notes,
              keyTakeaway: completionData.keyTakeaway || item.keyTakeaway,
              timeSpentMins: newTimeSpent,
              dateCompleted: isNowComplete ? todayStr : item.dateCompleted,
              needsRevision: isNowComplete ? (completionData.confidence > 0 && completionData.confidence <= 3) : item.needsRevision
            };
          }
          return item;
        });

        const completedCount = updatedTasks.filter(item => 
          ["Completed", "Solved", "Mastered", "Applied", "Revised"].includes(item.status)
        ).length;

        return { ...t, tasks: updatedTasks, progress: t.category === "project" ? t.progress : completedCount };
      }
      return t;
    }));

    if (completionData.logAsStudy) {
      const act = {
        id: `act-${Date.now()}`,
        taskId: task.id,
        date: todayStr,
        durationMinutes: completionData.timeSpentMins,
        desc: `Logged ${completionData.timeSpentMins}m on ${task.title}`,
        mode: "task", 
        confidence: completionData.confidence,
        keyTakeaway: completionData.keyTakeaway,
        notes: completionData.notes,
        trackId: trackId
      };
      setActivityLogs(prev => [...prev, act]);
    }

    if (isTaskFullyComplete) {
      executeCompletion(task);
    } else {
      if (currentFocusTask === task.id) {
        setCurrentFocusTask(null);
        setTimerIsRunning(false);
      }
    }
    setShowCompletionModal(false);
  };

  const activeFocusGoal = allPossibleTasks.find(t => t.id === currentFocusTask);
  const limit = timerOverrideLimit !== null ? timerOverrideLimit : (timerConfig[timerMode] || 25 * 60);
  const remainingSeconds = Math.max(0, limit - timerSeconds);
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;

  const getTaskRemainingMins = (task) => {
    if (task.type === "permanent") {
      const key = task.id.replace("perm-", "");
      const target = getPermanentTarget(key);
      const spent = todayPermanentProgress[key] || 0;
      return target > 0 ? target - spent : 0;
    }
    if (task.type === "plan" && task.sourceId && task.sourceId.includes("::")) {
      const [trackId, itemId] = task.sourceId.split("::");
      const track = tracks.find(t => t.id === trackId);
      if (track) {
        const item = track.tasks?.find(m => m.id === itemId);
        if (item && item.targetTimeMins > 0) {
          return item.targetTimeMins - (item.timeSpentMins || 0);
        }
      }
    }
    return 0;
  };

  const getTaskProgress = (task) => {
    if (task.type === "permanent") {
      const key = task.id.replace("perm-", "");
      const target = getPermanentTarget(key);
      const spent = todayPermanentProgress[key] || 0;
      return { spent, target };
    }
    if (task.type === "plan" && task.sourceId && task.sourceId.includes("::")) {
      const [trackId, itemId] = task.sourceId.split("::");
      const track = tracks.find(t => t.id === trackId);
      if (track) {
        const item = track.tasks?.find(m => m.id === itemId);
        if (item) {
          return { spent: item.timeSpentMins || 0, target: item.targetTimeMins || 0 };
        }
      }
    }
    return null;
  };

  const startFocus = (goalId) => {
    setCurrentFocusTask(goalId);
    setTimerMode("focus");
    
    const task = allPossibleTasks.find(t => t.id === goalId);
    if (task) {
      const remainingMins = getTaskRemainingMins(task);
      const defaultLimit = timerConfig["focus"];
      if (remainingMins > 0 && (remainingMins * 60) < defaultLimit) {
        setTimerOverrideLimit(remainingMins * 60);
      } else {
        setTimerOverrideLimit(null);
      }
    } else {
      setTimerOverrideLimit(null);
    }
  };

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
          else score += 15;
        }
      } else {
        score += 10;
      }
    });

    score += completedMissionCount * 10;

    return Math.min(100, score);
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

  const todayFocusSecs = todayFocusSeconds;

  const last7DaysSecs = activityLogs
    .filter(s => {
      const d = new Date(s.date);
      const diff = (new Date() - d) / (1000 * 60 * 60 * 24);
      return diff <= 7 && s.mode === "focus";
    })
    .reduce((sum, s) => sum + ((s.durationMinutes * 60) || (s.durationSeconds) || 0), 0);

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
        
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
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
                      {(() => {
                        const prog = getTaskProgress(task);
                        if (prog && prog.target > 0) {
                          const isRunning = timerIsRunning && currentFocusTask === task.id;
                          const liveSpent = prog.spent + (isRunning ? (activeFocusSession?.verifiedMinutes || 0) : 0);
                          return (
                            <span style={{ color: "var(--accent)", fontSize: "0.75rem", padding: "2px 6px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", marginLeft: "8px", textDecoration: "none" }}>
                              ({liveSpent}/{prog.target}m)
                            </span>
                          );
                        }
                        return null;
                      })()}
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

            {dailyGoalCandidates.length > 0 && (
              <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--card-border)", paddingTop: "1rem" }}>
                <h4 style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Available Goals & Tasks:</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {dailyGoalCandidates.filter(g => !todayMission.includes(g.id)).map(g => (
                    <div key={g.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", padding: "0.4rem", background: "rgba(0,0,0,0.2)", borderRadius: "4px" }}>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "80%" }}>
                        {g.title}
                      </span>
                      <button 
                        onClick={() => toggleMissionSelection(g.id)} 
                        disabled={activeMissionCount >= 3}
                        style={{ 
                          color: activeMissionCount >= 3 ? "var(--text-muted)" : "var(--accent)", 
                          background: "transparent", 
                          fontWeight: "bold",
                          cursor: activeMissionCount >= 3 ? "not-allowed" : "pointer"
                        }}>
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass-card" style={{ borderLeft: activeFocusGoal ? "4px solid var(--accent)" : "1px solid var(--card-border)" }}>
            <div className="glass-card-header">
              <h3><Rocket size={16} /> Current Focus</h3>
            </div>
            
            {activeFocusGoal ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", padding: "1rem 0" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: "bold", textAlign: "center", color: "#fff", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span>{activeFocusGoal.title}</span>
                  {(() => {
                    const prog = getTaskProgress(activeFocusGoal);
                     if (prog && prog.target > 0) {
                       const liveSpent = prog.spent + (activeFocusSession?.verifiedMinutes || 0);
                      return (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                          Progress: <strong style={{ color: "var(--accent)" }}>{liveSpent} / {prog.target}m</strong>
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
                
                <div style={{ fontSize: "3rem", fontWeight: "900", fontFamily: "var(--font-mono)", color: "var(--accent)", textShadow: "0 0 20px rgba(var(--accent-rgb), 0.4)" }}>
                  {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
                </div>
                
                <div style={{ display: "flex", gap: "1rem" }}>
                  <button onClick={() => setTimerIsRunning(!timerIsRunning)} className="btn-secondary" style={{ display: "flex", gap: "0.5rem", alignItems: "center", padding: "0.5rem 1.5rem" }}>
                    {timerIsRunning ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}
                  </button>
                  <button onClick={finishFocusSessionEarly} className="btn-primary" style={{ display: "flex", gap: "0.5rem", alignItems: "center", padding: "0.5rem 1.5rem", background: "rgba(255,255,255,0.1)", color: "#fff" }}>
                    <CheckCircle size={14} /> Finish Early
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

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
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

      {showCompletionModal && completionData.task && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <form onSubmit={handleModalSubmit} className="glass-card" style={{ width: "450px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ color: "var(--accent)" }}>Task Completed!</h3>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>{completionData.task.title}</p>
            </div>
            
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Confidence Score (1-5)</label>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "1rem" }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setCompletionData({ ...completionData, confidence: star })}
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                  >
                    <Star fill={star <= completionData.confidence ? "#ffb900" : "none"} color={star <= completionData.confidence ? "#ffb900" : "var(--text-muted)"} size={32} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Time Spent (Minutes)</label>
              <input 
                type="number" 
                value={completionData.timeSpentMins}
                onChange={e => setCompletionData({ ...completionData, timeSpentMins: e.target.value })}
                min="1"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Key Takeaway</label>
              <input 
                type="text" 
                value={completionData.keyTakeaway}
                onChange={e => setCompletionData({ ...completionData, keyTakeaway: e.target.value })}
                placeholder="What is the main thing you learned?"
              />
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Notes (Optional)</label>
              <textarea 
                value={completionData.notes}
                onChange={e => setCompletionData({ ...completionData, notes: e.target.value })}
                placeholder="Any additional thoughts or edge cases..."
                rows={3}
                style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", borderRadius: "6px", color: "#fff", padding: "0.5rem", fontSize: "0.85rem" }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button type="button" onClick={() => setShowCompletionModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Save Insights</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
