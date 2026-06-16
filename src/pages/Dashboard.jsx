import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { Link } from "react-router-dom";
import {
  Flame,
  Award,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Compass,
  ArrowRight,
  TrendingUp,
  Brain,
  Code,
  Folder,
  Zap,
  Heart,
  Save,
  Edit2,
  Bell,
  Sparkles,
  BookOpen,
  CheckCircle,
  Calendar,
  Activity
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  Legend
} from "recharts";

export default function Dashboard() {
  const {
    settings,
    setSettings,
    dailyPlans,
    tracks,
    goals,
    activityLogs,
    setActivityLogs,
    distractions,
    notifications,
    timerSeconds,
    timerIsRunning,
    setTimerIsRunning,
    timerMode,
    timerConfig,
    setTimerSeconds,
    todayFocusSeconds,
    todayGoalsChecked,
    todayPermanentProgress,
    setTodayGoalsChecked,
    todayMission,
    dailyScoreHistory,
    currentFocusTask,
    timerOverrideLimit,
    setTimerOverrideLimit,
    setTimerMode,
    activeFocusSession
  } = useApp();

  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  // Update theme colors dynamically
  useEffect(() => {
    const themeColor = settings?.themeColor || "#00a2ed";
    document.documentElement.style.setProperty("--accent", themeColor);
    const hex = themeColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 162;
    const b = parseInt(hex.substring(4, 6), 16) || 237;
    document.documentElement.style.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);
  }, [settings?.themeColor]);

  const todayStr = new Date().toLocaleDateString("en-CA");
  const todayPlansList = dailyPlans?.[todayStr] || [];

  const [bypassModalData, setBypassModalData] = useState(null);

  // --- Calculations ---

  // 1. Vacation days
  const getVacationInfo = () => {
    if (!settings?.vacationStart || !settings?.vacationEnd) return null;
    const start = new Date(settings.vacationStart);
    const end = new Date(settings.vacationEnd);
    const today = new Date();
    today.setHours(0,0,0,0);
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    
    if (today < start) {
      const diffTime = Math.abs(start - today);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `Vacation starts in ${diffDays} days`;
    }
    if (today > end) {
      return null;
    }
    const diffTime = Math.abs(today - start);
    const currentDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const totalTime = Math.abs(end - start);
    const totalDays = Math.floor(totalTime / (1000 * 60 * 60 * 24)) + 1;
    return `Vacation Day ${currentDay} of ${totalDays}`;
  };

  const vacationStr = getVacationInfo();

  // 2. Streaks (Based on logged activities today/yesterday)
  const getOutcomeStreak = () => {
    let streak = 0;
    const solvedDates = new Set((activityLogs || []).filter(Boolean).map(a => a.date));
    let checkDate = new Date();
    
    while (true) {
      const dateStr = checkDate.toLocaleDateString("en-CA");
      if (solvedDates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (dateStr === todayStr) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return streak;
  };

  const outcomeStreak = getOutcomeStreak();

  // 3. Focus and Productivity score
  const todayActs = (activityLogs || []).filter(a => a && a.date === todayStr);
  const studyActs = todayActs.filter(a => a.mode === "focus" || a.mode === "task");
  const todayStudyMinutes = studyActs.reduce((sum, a) => sum + (parseInt(a.durationMinutes, 10) || 0), 0);
  const todayStudyHours = (todayStudyMinutes / 60).toFixed(1);
  const deepWorkHours = (todayFocusSeconds / 3600).toFixed(1);

  // Execution Center Widget Data
  const todayPlans = (dailyPlans && dailyPlans[todayStr]) || [];
  
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
    ...(goals || []).filter(g => g.category === "daily").map(g => ({ id: g.id, title: g.title, type: "goal", completed: g.completed })),
    ...todayPlans.map(p => ({ id: p.id, title: `${p.label} (${p.start})`, type: "plan", completed: p.completed })),
    ...permGoalTasks
  ];
  const missionTasks = allPossibleTasks.filter(t => (todayMission || []).includes(t.id));
  const completedMissionCount = missionTasks.filter(g => g.completed).length;
  const todayScore = dailyScoreHistory?.[todayStr] || 0;
  const executionFocusHrs = Math.floor(todayFocusSeconds / 3600);
  const executionFocusMins = Math.floor((todayFocusSeconds % 3600) / 60);

  // Focus Score: Focus blocks hours completed today vs permanent goals DSA + Dev target
  const dsaTargetHour = parseFloat(settings?.permanentGoals?.dsa) || 3;
  const devTargetHour = parseFloat(settings?.permanentGoals?.development) || 2;
  const learnTargetHour = parseFloat(settings?.permanentGoals?.learning) || 2;
  const readTargetPage = parseInt(settings?.permanentGoals?.reading, 10) || 10;
  const exerciseTargetMin = parseInt(settings?.permanentGoals?.exercise, 10) || 30;

  const dailyFocusTargetHours = dsaTargetHour + devTargetHour;
  const focusScore = Math.min(100, Math.round((parseFloat(deepWorkHours) / (dailyFocusTargetHours || 1)) * 100));

  // Productivity Score: based on planner tasks completed + average logged activity quality
  const plannerTasks = dailyPlans?.[todayStr] || [];
  const completedPlannerCount = plannerTasks.filter(t => t && t.completed).length;
  const plannerPct = plannerTasks.length > 0 ? (completedPlannerCount / plannerTasks.length) * 100 : 100;
  
  const avgQualityPct = todayActs.length > 0 
    ? (todayActs.reduce((sum, a) => sum + (parseInt(a.quality, 10) || 4), 0) / (todayActs.length * 5)) * 100
    : 0;

  const productivityScore = Math.round(
    todayActs.length > 0 ? (plannerPct * 0.5 + avgQualityPct * 0.5) : plannerPct
  );

  // 4. Counts
  const activeTracksCount = (tracks || []).filter(t => t && t.status === "learning").length;

  // 5. Deadlines
  const upcomingDeadlines = [
    ...(goals || []).filter(g => g && !g.completed && g.deadline).map(g => ({ title: g.title, deadline: g.deadline, type: "goal" })),
    ...(tracks || []).filter(t => t && t.status === "learning" && t.deadline).map(t => ({ title: t.title, deadline: t.deadline, type: "track" }))
  ].sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 3);

  // 6. Today's progress stats (DSA, Dev, Learn checkboxes)
  const isOddDay = new Date().getDate() % 2 !== 0;
  const pillar1 = settings?.pillar1Name || "DSA Practice";
  const pillar2 = settings?.pillar2Name || "Development";

  const splitRecommendation = settings?.oddEvenMode 
    ? (isOddDay 
        ? { label: `ODD DAY (70% ${pillar1} / 30% ${pillar2})`, dsa: (dsaTargetHour * 1.2).toFixed(1), dev: (devTargetHour * 0.5).toFixed(1) }
        : { label: `EVEN DAY (40% ${pillar1} / 60% ${pillar2})`, dsa: (dsaTargetHour * 0.6).toFixed(1), dev: (devTargetHour * 1.5).toFixed(1) }
      )
    : { label: "STANDARD DAY", dsa: dsaTargetHour, dev: devTargetHour };

  const toggleGoalCheck = (key, targetMins, label) => {
    const isCurrentlyChecked = !!todayGoalsChecked?.[key];

    if (!isCurrentlyChecked) {
      // Add activity
      const act = {
        id: `auto-${key}-${todayStr}`,
        date: todayStr,
        desc: `Completed Daily Target: ${label}`,
        trackId: "",
        durationMinutes: targetMins,
        quality: 4
      };
      setActivityLogs(prev => [act, ...prev]);
    } else {
      // Remove activity
      setActivityLogs(prev => prev.filter(a => a.id !== `auto-${key}-${todayStr}`));
    }

    setTodayGoalsChecked(prev => ({ ...prev, [key]: !isCurrentlyChecked }));
  };

  const handleCheckboxClick = (key, targetMins, label) => {
    const isCompleted = !!todayGoalsChecked?.[key];
    if (!isCompleted) {
      setBypassModalData({ key, targetMins, label });
    } else {
      toggleGoalCheck(key, targetMins, label);
    }
  };

  const handleBypassConfirm = () => {
    if (bypassModalData) {
      toggleGoalCheck(bypassModalData.key, bypassModalData.targetMins, bypassModalData.label);
      setBypassModalData(null);
    }
  };

  const getLiveProgress = (key) => {
    let base = todayPermanentProgress?.[key] || 0;
    if (currentFocusTask === `perm-${key}`) {
      base += activeFocusSession?.verifiedMinutes || 0;
    }
    return base;
  };

  useEffect(() => {
    const dsaTarget = Math.round(parseFloat(splitRecommendation.dsa) * 60);
    const devTarget = Math.round(parseFloat(splitRecommendation.dev) * 60);
    const learnTarget = Math.round(learnTargetHour * 60);
    const readTarget = readTargetPage * 2;
    const exTarget = exerciseTargetMin;

    setTodayGoalsChecked(prev => {
      let changed = false;
      const next = { ...prev };
      
      if (!prev.dsa && getLiveProgress("dsa") >= dsaTarget && dsaTarget > 0) { next.dsa = true; changed = true; }
      if (!prev.development && getLiveProgress("development") >= devTarget && devTarget > 0) { next.development = true; changed = true; }
      if (!prev.learning && getLiveProgress("learning") >= learnTarget && learnTarget > 0) { next.learning = true; changed = true; }
      if (!prev.reading && getLiveProgress("reading") >= readTarget && readTarget > 0) { next.reading = true; changed = true; }
      if (!prev.exercise && getLiveProgress("exercise") >= exTarget && exTarget > 0) { next.exercise = true; changed = true; }
      
      return changed ? next : prev;
    });
  }, [todayPermanentProgress, activeFocusSession, splitRecommendation, setTodayGoalsChecked, currentFocusTask]);

  // 7. Timer setup
  const activeLimit = timerOverrideLimit !== null ? timerOverrideLimit : (timerConfig?.[timerMode] || 25 * 60);
  const timeRemaining = Math.max(0, activeLimit - timerSeconds);
  const remainingMins = Math.floor(timeRemaining / 60);
  const remainingSecs = timeRemaining % 60;
  const circleRadius = 55;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference * (1 - timeRemaining / activeLimit);

  const skipTimer = () => {
    setTimerIsRunning(false);
    setTimerSeconds(0);
    setTimerOverrideLimit(null);
    setTimerMode(prev => prev === "focus" ? "shortBreak" : prev === "shortBreak" ? "longBreak" : "focus");
  };

  // 8. Weekly stats chart calculations
  const getWeeklyStatsData = () => {
    const data = [];
    const today = new Date();
    const fSessions = activityLogs ? activityLogs.filter(a => a.mode === "focus") : [];
    const dists = distractions || [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString("en-CA");

      const focusSecs = fSessions.filter(s => s && s.date === dateStr && s.mode === "focus").reduce((sum, s) => sum + ((s.durationMinutes * 60) || (s.durationSeconds) || 0), 0);
      const distractMins = dists.filter(dist => dist && dist.date === dateStr).reduce((sum, dist) => sum + (dist.durationMinutes || 0), 0);

      data.push({
        name: d.toLocaleDateString([], { weekday: "short" }),
        FocusHrs: parseFloat((focusSecs / 3600).toFixed(1)),
        DistractHrs: parseFloat((distractMins / 60).toFixed(1))
      });
    }
    return data;
  };

  const chartData = getWeeklyStatsData();

  const getScoreColor = (score) => {
    if (score < 40) return "#f25022"; // Red
    if (score < 80) return "#ffb900"; // Yellow
    return "#7fba00"; // Green
  };

  return (
    <div className="dashboard-container">
      {/* Banner */}
      <div className="dashboard-banner">
        <div className="banner-subtitle">LaunchPad Personal Growth OS</div>
        <div className="banner-title" style={{ color: settings?.themeColor || "var(--accent)" }}>
          Welcome back to {(settings?.targetCompany || "Microsoft").toUpperCase()} preparation
        </div>
        <div className="banner-motto" style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "4px" }}>
          {vacationStr && (
            <span style={{ color: "#ffb900", fontWeight: "bold" }}>🏖️ {vacationStr}</span>
          )}
          <span>🔥 Streak: <strong>{outcomeStreak} Days</strong></span>
          <span>🎯 Active Tracks: <strong>{activeTracksCount}</strong></span>
          <span>📅 Planner Tasks: <strong>{completedPlannerCount}/{plannerTasks.length} Completed</strong></span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <div className="glass-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: getScoreColor(focusScore) }}>
            {focusScore}%
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", marginTop: "2px" }}>
            Focus Score
          </div>
        </div>

        <div className="glass-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: getScoreColor(productivityScore) }}>
            {productivityScore}%
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", marginTop: "2px" }}>
            Productivity Score
          </div>
        </div>

        <div className="glass-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--accent)" }}>
            {todayStudyHours} hrs
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", marginTop: "2px" }}>
            Study Hours Today
          </div>
        </div>

        <div className="glass-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#a855f7" }}>
            {deepWorkHours} hrs
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", marginTop: "2px" }}>
            Deep Work Today
          </div>
        </div>
      </div>

      {/* Grid columns */}
      <div className="dashboard-grid">
        
        {/* Left Column: Progress trackers & Daily Checklist */}
        <div className="column">
          {/* DAILY GOALS CHECKLIST */}
          <div className="glass-card">
            <div className="glass-card-header">
              <h3>Today's Daily Targets</h3>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{splitRecommendation.label}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <label className={`custom-checkbox ${todayGoalsChecked?.dsa ? "checked" : ""}`}>
                <input type="checkbox" checked={!!todayGoalsChecked?.dsa} onChange={() => handleCheckboxClick("dsa", Math.round(parseFloat(splitRecommendation.dsa) * 60), pillar1)} />
                <div className="checkbox-box"></div>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px", textDecoration: todayGoalsChecked?.dsa ? "line-through" : "none", color: todayGoalsChecked?.dsa ? "var(--text-muted)" : "inherit" }}>
                    □ {splitRecommendation.dsa} Hours {pillar1}
                    <span style={{ color: "var(--accent)", fontSize: "0.6rem", padding: "1px 4px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", textDecoration: "none" }}>
                      ({getLiveProgress("dsa")}/{Math.round(parseFloat(splitRecommendation.dsa) * 60)}m)
                    </span>
                  </span>
                </div>
              </label>

              <label className={`custom-checkbox ${todayGoalsChecked?.development ? "checked" : ""}`}>
                <input type="checkbox" checked={!!todayGoalsChecked?.development} onChange={() => handleCheckboxClick("development", Math.round(parseFloat(splitRecommendation.dev) * 60), pillar2)} />
                <div className="checkbox-box"></div>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px", textDecoration: todayGoalsChecked?.development ? "line-through" : "none", color: todayGoalsChecked?.development ? "var(--text-muted)" : "inherit" }}>
                    □ {splitRecommendation.dev} Hours {pillar2}
                    <span style={{ color: "var(--accent)", fontSize: "0.6rem", padding: "1px 4px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", textDecoration: "none" }}>
                      ({getLiveProgress("development")}/{Math.round(parseFloat(splitRecommendation.dev) * 60)}m)
                    </span>
                  </span>
                </div>
              </label>

              <label className={`custom-checkbox ${todayGoalsChecked?.learning ? "checked" : ""}`}>
                <input type="checkbox" checked={!!todayGoalsChecked?.learning} onChange={() => handleCheckboxClick("learning", Math.round(learnTargetHour * 60), "Theory Lectures")} />
                <div className="checkbox-box"></div>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px", textDecoration: todayGoalsChecked?.learning ? "line-through" : "none", color: todayGoalsChecked?.learning ? "var(--text-muted)" : "inherit" }}>
                    □ {learnTargetHour} Hours Theory lectures
                    <span style={{ color: "var(--accent)", fontSize: "0.6rem", padding: "1px 4px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", textDecoration: "none" }}>
                      ({getLiveProgress("learning")}/{Math.round(learnTargetHour * 60)}m)
                    </span>
                  </span>
                </div>
              </label>

              <label className={`custom-checkbox ${todayGoalsChecked?.reading ? "checked" : ""}`}>
                <input type="checkbox" checked={!!todayGoalsChecked?.reading} onChange={() => handleCheckboxClick("reading", readTargetPage * 2, "Book Reading")} />
                <div className="checkbox-box"></div>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px", textDecoration: todayGoalsChecked?.reading ? "line-through" : "none", color: todayGoalsChecked?.reading ? "var(--text-muted)" : "inherit" }}>
                    □ {readTargetPage} Pages Book reading
                    <span style={{ color: "var(--accent)", fontSize: "0.6rem", padding: "1px 4px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", textDecoration: "none" }}>
                      ({getLiveProgress("reading")}/{readTargetPage * 2}m)
                    </span>
                  </span>
                </div>
              </label>

              <label className={`custom-checkbox ${todayGoalsChecked?.exercise ? "checked" : ""}`}>
                <input type="checkbox" checked={!!todayGoalsChecked?.exercise} onChange={() => handleCheckboxClick("exercise", exerciseTargetMin, "Workout")} />
                <div className="checkbox-box"></div>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px", textDecoration: todayGoalsChecked?.exercise ? "line-through" : "none", color: todayGoalsChecked?.exercise ? "var(--text-muted)" : "inherit" }}>
                    □ {exerciseTargetMin} Minutes Workout
                    <span style={{ color: "var(--accent)", fontSize: "0.6rem", padding: "1px 4px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", textDecoration: "none" }}>
                      ({getLiveProgress("exercise")}/{exerciseTargetMin}m)
                    </span>
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* EXECUTION CENTER WIDGET */}
          <Link to="/execution" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="glass-card" style={{ cursor: "pointer", border: "1px solid rgba(var(--accent-rgb), 0.3)", background: "linear-gradient(145deg, rgba(var(--accent-rgb), 0.05), rgba(0,0,0,0.2))" }}>
              <div className="glass-card-header">
                <h3>Today's Execution</h3>
                <span style={{ fontSize: "0.7rem", color: "var(--accent)" }}>Open <ArrowRight size={10} style={{ marginLeft: "2px" }} /></span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Mission</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{completedMissionCount}/{missionTasks.length} Done</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Focus Time</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{executionFocusHrs}h {executionFocusMins}m</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Daily Score</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#7fba00" }}>{todayScore}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Current Streak</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#ffb900" }}>{outcomeStreak} Days</span>
                </div>
              </div>
            </div>
          </Link>

          {/* ACTIVE TRACK SUMMARY */}
          <div className="glass-card">
            <div className="glass-card-header">
              <h3>Learning Tracks Summary</h3>
              <Link to="/tracks" style={{ color: "var(--accent)", fontSize: "0.75rem", display: "flex", alignItems: "center" }}>
                Manage <ArrowRight size={12} style={{ marginLeft: "2px" }} />
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {(tracks || []).filter(t => t && t.status === "learning").length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "1rem", fontSize: "0.8rem" }}>
                  No active tracks logged.
                </div>
              ) : (
                (tracks || []).filter(t => t && t.status === "learning").map(t => {
                  const pct = Math.min(100, Math.round(((t.progress || 0) / (t.target || 1)) * 100)) || 0;
                  return (
                    <div key={t.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "3px" }}>
                        <span style={{ fontWeight: 600, color: "#fff" }}>{t.title}</span>
                        <span>{t.progress}/{t.target} {t.unit} ({pct}%)</span>
                      </div>
                      <div className="milestone-bar-bg" style={{ height: "4px" }}>
                        <div className="milestone-bar-fill" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Center Column: Timer & Recommendation logs */}
        <div className="column">
          {/* TODAY'S FOCUS POMODORO TIMER */}
          <div className="glass-card">
            <div className="glass-card-header">
              <h3>Today's Deep Focus</h3>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "1rem", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 110, height: 110, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", fontFamily: "var(--font-mono)" }}>
                      {remainingMins.toString().padStart(2, "0")}:{remainingSecs.toString().padStart(2, "0")}
                    </div>
                    <div style={{ fontSize: "0.55rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      {timerMode === "focus" ? "FOCUS" : "REST"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
                  <button onClick={() => setTimerIsRunning(!timerIsRunning)} className="timer-btn">
                    {timerIsRunning ? <Pause size={10} /> : <Play size={10} />}
                  </button>
                  <button onClick={skipTimer} className="timer-btn">
                    <ArrowRight size={10} />
                  </button>
                  <button onClick={() => { setTimerIsRunning(false); setTimerSeconds(0); }} className="timer-btn">
                    <RotateCcw size={10} />
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <button onClick={() => { setTimerIsRunning(false); setTimerMode("focus"); setTimerSeconds(0); setTimerOverrideLimit(null); }} className="btn-secondary" style={{ fontSize: "0.75rem", padding: "4px 8px" }}>
                  Focus Timer ({Math.floor((timerConfig?.focus || 1500) / 60)} min)
                </button>
                <button onClick={() => { setTimerIsRunning(false); setTimerMode("shortBreak"); setTimerSeconds(0); setTimerOverrideLimit(null); }} className="btn-secondary" style={{ fontSize: "0.75rem", padding: "4px 8px" }}>
                  Short Break ({Math.floor((timerConfig?.shortBreak || 300) / 60)} min)
                </button>
                <button onClick={() => { setTimerIsRunning(false); setTimerMode("longBreak"); setTimerSeconds(0); setTimerOverrideLimit(null); }} className="btn-secondary" style={{ fontSize: "0.75rem", padding: "4px 8px" }}>
                  Long Break ({Math.floor((timerConfig?.longBreak || 900) / 60)} min)
                </button>
              </div>
            </div>
          </div>

          {/* RECENT OUTCOME ACTIVITIES */}
          <div className="glass-card">
            <div className="glass-card-header">
              <h3>Recent Logged Outcomes</h3>
              <Link to="/activity-log" style={{ color: "var(--accent)", fontSize: "0.75rem" }}>View Logs</Link>
            </div>
            
            <div className="card-content">
              {(activityLogs || []).length === 0 ? (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  No activities logged yet.
                </div>
              ) : (
                [...(activityLogs || [])].filter(Boolean).sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 3).map((act) => {
                  const matchingTrack = (tracks || []).find(t => t && t.id === act.trackId);
                  return (
                    <div 
                      key={act.id}
                      style={{
                        background: "rgba(0,0,0,0.15)",
                        border: "1px solid rgba(255,255,255,0.02)",
                        borderRadius: "6px",
                        padding: "0.45rem",
                        fontSize: "0.75rem"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#fff", marginBottom: "2px" }}>
                        <span>{act.desc}</span>
                        <span style={{ color: "var(--accent)" }}>{act.durationMinutes}m</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "0.65rem" }}>
                        <span>Track: {matchingTrack ? matchingTrack.title : "General"}</span>
                        <span>Rating: {"⭐".repeat(act.quality || 4)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Alerts and Weekly charts */}
        <div className="column">
          {/* SMART recommendations */}
          <div className="glass-card">
            <div className="glass-card-header">
              <h3>
                <Bell size={14} style={{ color: "var(--accent)", marginRight: "4px" }} />
                <span>Smart Mentor Advisor</span>
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "180px", overflowY: "auto" }}>
              {(notifications || []).length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "1rem", fontSize: "0.8rem" }}>
                  🎉 Setup optimal. No warnings generated this period.
                </div>
              ) : (
                (notifications || []).filter(Boolean).map((nt) => (
                  <div 
                    key={nt.id}
                    style={{
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid rgba(255,255,255,0.03)",
                      borderRadius: "6px",
                      padding: "0.5rem",
                      fontSize: "0.75rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      borderLeft: `3px solid ${nt.type === "danger" ? "#f25022" : nt.type === "warning" ? "#ffb900" : "var(--accent)"}`
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                      <span style={{ color: nt.type === "danger" ? "#f25022" : nt.type === "warning" ? "#ffb900" : "var(--accent)" }}>
                        {nt.tag}
                      </span>
                      <AlertTriangle size={12} style={{ color: nt.type === "danger" ? "#f25022" : nt.type === "warning" ? "#ffb900" : "var(--accent)" }} />
                    </div>
                    <div style={{ color: "var(--text-secondary)" }}>{nt.text}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* UPCOMING DEADLINES */}
          {upcomingDeadlines.length > 0 && (
            <div className="glass-card">
              <div className="glass-card-header">
                <h3>Approaching Deadlines</h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {upcomingDeadlines.map((dl, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.75rem",
                      background: "rgba(239, 80, 34, 0.05)",
                      border: "1px solid rgba(239, 80, 34, 0.15)",
                      padding: "0.45rem",
                      borderRadius: "4px"
                    }}
                  >
                    <span style={{ color: "#fff", fontWeight: 600 }}>{dl.title}</span>
                    <span style={{ color: "#f25022", fontSize: "0.7rem", fontWeight: "bold" }}>{dl.deadline}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WEEKLY statistics */}
          <div className="glass-card">
            <div className="glass-card-header">
              <h3>Weekly Statistics (Focus vs Wasted)</h3>
            </div>
            
            <div style={{ width: "100%", height: "140px", marginTop: "0.5rem" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={9} tickLine={true} />
                  <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={true} />
                  <ChartTooltip wrapperStyle={{ fontSize: "10px" }} cursor={false}/>
                  <Bar dataKey="FocusHrs" name="Focus Work (Hrs)" fill="var(--accent)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="DistractHrs" name="Wasted (Hrs)" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ width: "100%", height: "140px", marginTop: "0.5rem" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                  <ChartTooltip wrapperStyle={{ fontSize: "10px" }} />
                  <Line dataKey="FocusHrs" name="Focus Work (Hrs)" stroke="var(--accent)" strokeWidth={2} dot={false} />
                  <Line dataKey="DistractHrs" name="Wasted (Hrs)" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

      {bypassModalData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "400px", textAlign: "center" }}>
            <h3 style={{ color: "#ff4444", marginBottom: "1rem" }}>Manual Bypass Warning</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: "1.5" }}>
              Are you lying to yourself? Did you really put in the focused work to earn this completion, or are you just skimming the surface? True progress requires accountability.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button 
                onClick={handleBypassConfirm}
                className="btn-primary"
                style={{ background: "#ff4444", color: "#fff", borderColor: "#ff4444" }}
              >
                Yes, I did the hard work
              </button>
              <button 
                onClick={() => setBypassModalData(null)}
                className="btn-secondary"
              >
                No, I need more time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}