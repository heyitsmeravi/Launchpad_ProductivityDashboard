import { createContext, useContext, useState, useEffect, useRef } from "react";

const AppContext = createContext();

// 1. DEFAULT STRUCTURES
const DEFAULT_SETTINGS = {
  themeColor: "#00a2ed",
  targetCompany: "Microsoft",
  pillar1Name: "DSA Practice",
  pillar2Name: "Development",
  oddEvenMode: true,
  vacationStart: "",
  vacationEnd: "",
  permanentGoals: {
    dsa: 3, // Hours
    learning: 2, // Hours
    development: 2, // Hours
    reading: 10, // Pages
    exercise: 30 // Minutes
  }
};

const DEFAULT_TRACKS = [];
const DEFAULT_PLANS = {};
const DEFAULT_GOALS = [];
const DEFAULT_ACTIVITIES = [];
const DEFAULT_DISTRACTIONS = [];
const DEFAULT_FOCUS_SESSIONS = [];

const DEFAULT_DAILY_REFLECTIONS = [];
const DEFAULT_DAILY_SCORE_HISTORY = {};

export const AppProvider = ({ children }) => {
  // --- Version Check & Automated Migration Clean Reset ---
  const CURRENT_OS_VERSION = "v6";
  const savedVersion = localStorage.getItem("lp_os_version");
  if (savedVersion !== CURRENT_OS_VERSION) {
    const keysToRemove = [
      "lp_learningTracks", "lp_projects", "lp_roadmaps", 
      "lp_dailyPlans", "lp_goals", "lp_activities", "lp_distractions", 
      "lp_focusSessions", "lp_activityLogs", "lp_weeklyReviews", "lp_notifications",
      "lp_todayMission", "lp_currentFocusTask", "lp_dailyScoreHistory", "lp_dailyReflections"
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));
    localStorage.setItem("lp_os_version", CURRENT_OS_VERSION);
  }

  // Helper to load localStorage safely
  const loadState = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      console.error("Error loading localStorage key: " + key, e);
      return defaultValue;
    }
  };

  // --- 2. STATES & AUTOMATIC LOCAL STORAGE DATA MIGRATIONS ---
  const [settings, setSettings] = useState(() => {
    const loaded = loadState("lp_settings", DEFAULT_SETTINGS);
    return {
      themeColor: loaded?.themeColor || DEFAULT_SETTINGS.themeColor,
      targetCompany: loaded?.targetCompany || DEFAULT_SETTINGS.targetCompany,
      pillar1Name: loaded?.pillar1Name || DEFAULT_SETTINGS.pillar1Name,
      pillar2Name: loaded?.pillar2Name || DEFAULT_SETTINGS.pillar2Name,
      oddEvenMode: loaded?.oddEvenMode !== undefined ? loaded.oddEvenMode : DEFAULT_SETTINGS.oddEvenMode,
      vacationStart: loaded?.vacationStart || "",
      vacationEnd: loaded?.vacationEnd || "",
      permanentGoals: {
        dsa: loaded?.permanentGoals?.dsa !== undefined ? parseFloat(loaded.permanentGoals.dsa) : DEFAULT_SETTINGS.permanentGoals.dsa,
        learning: loaded?.permanentGoals?.learning !== undefined ? parseFloat(loaded.permanentGoals.learning) : DEFAULT_SETTINGS.permanentGoals.learning,
        development: loaded?.permanentGoals?.development !== undefined ? parseFloat(loaded.permanentGoals.development) : DEFAULT_SETTINGS.permanentGoals.development,
        reading: loaded?.permanentGoals?.reading !== undefined ? parseInt(loaded.permanentGoals.reading, 10) : DEFAULT_SETTINGS.permanentGoals.reading,
        exercise: loaded?.permanentGoals?.exercise !== undefined ? parseInt(loaded.permanentGoals.exercise, 10) : DEFAULT_SETTINGS.permanentGoals.exercise
      }
    };
  });

  const [tracks, setTracks] = useState(() => {
    try {
      const savedTracks = localStorage.getItem("lp_tracks");
      if (savedTracks) {
        return JSON.parse(savedTracks);
      }
      // Migrate from old schemas
      const migrated = [];
      const legacyTracks = localStorage.getItem("lp_learningTracks");
      if (legacyTracks) {
        const parsed = JSON.parse(legacyTracks);
        if (Array.isArray(parsed)) {
          parsed.forEach(t => {
            migrated.push({
              id: t.id || "track-" + Math.random().toString(36).substr(2, 9),
              title: t.title || "Untitled Track",
              category: t.category || "course",
              target: parseInt(t.target, 10) || 50,
              progress: parseInt(t.progress, 10) || 0,
              unit: t.category === "book" ? "Pages" : t.category === "playlist" ? "Videos" : "Lessons",
              priority: t.priority || "medium",
              deadline: t.deadline || "",
              status: t.status === "done" ? "completed" : "learning",
              tasks: t.tasks || []
            });
          });
        }
      }
      const legacyProjects = localStorage.getItem("lp_projects");
      if (legacyProjects) {
        const parsed = JSON.parse(legacyProjects);
        if (Array.isArray(parsed)) {
          parsed.forEach(p => {
            const miles = p.milestones || [];
            migrated.push({
              id: p.id || "proj-" + Math.random().toString(36).substr(2, 9),
              title: p.name || "Untitled Project",
              category: "project",
              target: 100,
              progress: p.status === "done" ? 100 : Math.round((miles.filter(m => m.checked).length / (miles.length || 1)) * 100),
              unit: "Percent",
              priority: p.priority || "medium",
              deadline: p.deadline || "",
              status: p.status === "done" ? "completed" : "learning",
              tasks: miles.map(m => ({ id: m.id, text: m.text, completed: m.checked })),
              description: p.desc || ""
            });
          });
        }
      }
      return migrated.length > 0 ? migrated : DEFAULT_TRACKS;
    } catch (e) {
      console.error("Failed to migrate tracks:", e);
      return DEFAULT_TRACKS;
    }
  });

  const [dailyPlans, setDailyPlans] = useState(() => {
    const loaded = loadState("lp_dailyPlans", null);
    if (!loaded || typeof loaded !== "object" || Array.isArray(loaded)) return DEFAULT_PLANS;
    // Migrate categories
    const migrated = {};
    Object.entries(loaded).forEach(([dateStr, plans]) => {
      if (Array.isArray(plans)) {
        migrated[dateStr] = plans.map(p => {
          let category = p.category;
          if (!category) {
            if (p.type === "study" || p.type === "development") category = "must";
            else if (p.type === "learning") category = "should";
            else category = "optional";
          }
          return {
            id: p.id || "p-block-" + Math.random().toString().split(".")[1],
            start: p.start || "09:00 AM",
            end: p.end || "11:00 AM",
            label: p.label || "TASK",
            desc: p.desc || "",
            category: category,
            completed: p.completed || false
          };
        });
      }
    });
    return migrated;
  });

  const [goals, setGoals] = useState(() => {
    const loaded = loadState("lp_goals", DEFAULT_GOALS);
    return Array.isArray(loaded) ? loaded.filter(Boolean) : DEFAULT_GOALS;
  });
  
  // Unified Activity Ledger (Replaces activities and focusSessions)
  const [activityLogs, setActivityLogs] = useState(() => {
    const loaded = loadState("lp_activityLogs", []);
    return Array.isArray(loaded) ? loaded.filter(Boolean) : [];
  });

  const [distractions, setDistractions] = useState(() => {
    const loaded = loadState("lp_distractions", DEFAULT_DISTRACTIONS);
    return Array.isArray(loaded) ? loaded.filter(Boolean) : DEFAULT_DISTRACTIONS;
  });
  const [notifications, setNotifications] = useState(() => {
    const loaded = loadState("lp_notifications", []);
    return Array.isArray(loaded) ? loaded.filter(Boolean) : [];
  });

  // --- Execution Center States ---
  const [todayMission, setTodayMission] = useState(() => {
    const loaded = loadState("lp_todayMission", []);
    return Array.isArray(loaded) ? loaded : [];
  });
  
  const [currentFocusTask, setCurrentFocusTask] = useState(() => {
    return loadState("lp_currentFocusTask", null);
  });
  
  const [dailyScoreHistory, setDailyScoreHistory] = useState(() => {
    return loadState("lp_dailyScoreHistory", DEFAULT_DAILY_SCORE_HISTORY);
  });
  
  const [dailyReflections, setDailyReflections] = useState(() => {
    const loaded = loadState("lp_dailyReflections", DEFAULT_DAILY_REFLECTIONS);
    return Array.isArray(loaded) ? loaded : DEFAULT_DAILY_REFLECTIONS;
  });

  const [dsaProblems, setDsaProblems] = useState(() => {
    const loaded = loadState("lp_dsaProblems", []);
    return Array.isArray(loaded) ? loaded : [];
  });

  const [roadmaps, setRoadmaps] = useState(() => {
    const loaded = loadState("lp_roadmaps", []);
    return Array.isArray(loaded) ? loaded : [];
  });

  const [projects, setProjects] = useState(() => {
    const loaded = loadState("lp_projects", []);
    return Array.isArray(loaded) ? loaded : [];
  });

  // Focus Timer active states
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerIsRunning, setTimerIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState("focus"); // focus, short, long
  const [timerConfig, setTimerConfig] = useState({ focus: 25 * 60, short: 5 * 60, long: 15 * 60 });
  const [timerActivePlanId, setTimerActivePlanId] = useState(null);

  // Track today's completed focus seconds
  const [todayFocusSeconds, setTodayFocusSeconds] = useState(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const saved = localStorage.getItem("lp_today_focus_seconds_" + todayStr);
    return saved ? parseInt(saved) : 0;
  });

  // Today's goals status (checked permanent goals)
  const [todayGoalsChecked, setTodayGoalsChecked] = useState(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return loadState("lp_today_goals_checked_" + todayStr, {
      dsa: false,
      learning: false,
      development: false,
      reading: false,
      exercise: false
    });
  });

  // --- 3. SAVE STATES TO LOCALSTORAGE ---
  useEffect(() => { localStorage.setItem("lp_settings", JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem("lp_tracks", JSON.stringify(tracks)); }, [tracks]);
  useEffect(() => { localStorage.setItem("lp_dailyPlans", JSON.stringify(dailyPlans)); }, [dailyPlans]);
  useEffect(() => { localStorage.setItem("lp_goals", JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem("lp_activityLogs", JSON.stringify(activityLogs)); }, [activityLogs]);
  useEffect(() => { localStorage.setItem("lp_distractions", JSON.stringify(distractions)); }, [distractions]);
  useEffect(() => { localStorage.setItem("lp_notifications", JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem("lp_projects", JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem("lp_todayMission", JSON.stringify(todayMission)); }, [todayMission]);
  useEffect(() => { localStorage.setItem("lp_currentFocusTask", JSON.stringify(currentFocusTask)); }, [currentFocusTask]);
  useEffect(() => { localStorage.setItem("lp_dailyScoreHistory", JSON.stringify(dailyScoreHistory)); }, [dailyScoreHistory]);
  useEffect(() => { localStorage.setItem("lp_dailyReflections", JSON.stringify(dailyReflections)); }, [dailyReflections]);
  useEffect(() => { localStorage.setItem("lp_dsaProblems", JSON.stringify(dsaProblems)); }, [dsaProblems]);
  useEffect(() => { localStorage.setItem("lp_roadmaps", JSON.stringify(roadmaps)); }, [roadmaps]);

  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    localStorage.setItem("lp_today_focus_seconds_" + todayStr, todayFocusSeconds.toString());
  }, [todayFocusSeconds]);

  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    localStorage.setItem("lp_today_goals_checked_" + todayStr, JSON.stringify(todayGoalsChecked));
  }, [todayGoalsChecked]);

  // --- 4. TIMER TICK EFFECT (Resilient to background throttling) ---
  const [lastTick, setLastTick] = useState(null);
  const prevTimerSecondsRef = useRef(0);

  useEffect(() => {
    if (timerIsRunning) {
      setLastTick(Date.now());
      prevTimerSecondsRef.current = timerSeconds;
    } else {
      setLastTick(null);
    }
  }, [timerIsRunning]);

  useEffect(() => {
    let interval = null;
    if (timerIsRunning && lastTick) {
      interval = setInterval(() => {
        setLastTick(prevTick => {
          const now = Date.now();
          const deltaSecs = Math.floor((now - prevTick) / 1000);
          
          if (deltaSecs > 0) {
            setTimerSeconds(prev => {
              const limit = timerConfig[timerMode];
              const nextSecs = prev + deltaSecs;
              return nextSecs >= limit ? limit : nextSecs;
            });
            return prevTick + (deltaSecs * 1000);
          }
          return prevTick;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerIsRunning, lastTick, timerMode, timerConfig]);

  useEffect(() => {
    if (!timerIsRunning) return;

    const limit = timerConfig[timerMode];
    const diff = timerSeconds - prevTimerSecondsRef.current;

    if (diff > 0) {
      if (timerMode === "focus") {
        setTodayFocusSeconds(s => s + diff);
      }
      prevTimerSecondsRef.current = timerSeconds;
    }

    if (timerSeconds >= limit) {
      setTimerIsRunning(false);
      setTimerSeconds(0);
      
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        const playBeep = (time, freq, duration) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(0.5, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
          osc.start(time);
          osc.stop(time + duration);
        };

        const now = audioCtx.currentTime;
        playBeep(now, 523.25, 0.4);       // C5
        playBeep(now + 0.4, 659.25, 0.4); // E5
        playBeep(now + 0.8, 783.99, 0.8); // G5 (longer)
      } catch (e) {}

      if (timerMode === "focus") {
        const todayStr = new Date().toISOString().split("T")[0];
        const newSession = {
          id: `act-${Date.now()}`,
          taskId: timerActivePlanId,
          date: todayStr,
          durationMinutes: Math.round(limit / 60),
          desc: "Completed focus session",
          mode: "focus"
        };
        setActivityLogs(prev => [...prev, newSession]);

        if (timerActivePlanId) {
          setDailyPlans(prev => {
            const todayPlans = prev[todayStr] || [];
            const updated = todayPlans.map(p => p.id === timerActivePlanId ? { ...p, completed: true } : p);
            return { ...prev, [todayStr]: updated };
          });
          setTimerActivePlanId(null);
        }
      }
    }
  }, [timerSeconds, timerIsRunning, timerMode, timerConfig, timerActivePlanId]);

  // Midnight checker logic
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const lastDate = localStorage.getItem("lp_last_opened_date_v4");
    if (lastDate && lastDate !== todayStr) {
      setTodayFocusSeconds(0);
      setTodayGoalsChecked({
        dsa: false,
        learning: false,
        development: false,
        reading: false,
        exercise: false
      });
      setDailyPlans(prev => {
        if (!prev[todayStr]) {
          const savedTemplate = localStorage.getItem("lp_saved_plans_template");
          const templatePlans = savedTemplate ? JSON.parse(savedTemplate) : DEFAULT_PLANS[Object.keys(DEFAULT_PLANS)[0]];
          return {
            ...prev,
            [todayStr]: templatePlans.map(p => ({ ...p, id: "p-" + Date.now() + Math.random().toString().split(".")[1], completed: false }))
          };
        }
        return prev;
      });
    }
    localStorage.setItem("lp_last_opened_date_v4", todayStr);
  }, []);

  // --- 5. SMART RECOMMENDATION ENGINE ---
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const newNotifications = [];

    // A. Check Neglected Tracks (no logged activity for 5+ days)
    const activeTracks = tracks.filter(t => t.status === "learning");
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    activeTracks.forEach(track => {
      const trackActivities = activityLogs.filter(a => a.trackId === track.id);
      if (trackActivities.length > 0) {
        const sortedAct = [...trackActivities].sort((a, b) => new Date(b.date) - new Date(a.date));
        const latestAct = sortedAct[0];
        if (new Date(latestAct.date) < fiveDaysAgo) {
          newNotifications.push({
            id: `neglect-${track.id}`,
            text: `"${track.title}" progress has stalled for 5 days. Consider recording a study log.`,
            type: "warning",
            tag: "Neglected Track"
          });
        }
      }
    });

    // B. Check Balance (DSA vs Projects in last 7 days)
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().split("T")[0]);
    }

    const last7DaysActivities = activityLogs.filter(a => last7Days.includes(a.date));
    let dsaMins = 0;
    let projMins = 0;
    last7DaysActivities.forEach(a => {
      const track = tracks.find(t => t.id === a.trackId);
      if (track) {
        if (track.category === "dsa") dsaMins += a.durationMinutes;
        if (track.category === "project") projMins += a.durationMinutes;
      }
    });

    if (dsaMins > 0 && projMins === 0 && activeTracks.some(t => t.category === "project")) {
      newNotifications.push({
        id: "balance-dsa-proj",
        text: "You are spending all your coding time on DSA rather than projects. Consider dedicating time to your projects.",
        type: "info",
        tag: "Suggested Focus"
      });
    } else if (dsaMins > projMins * 3 && projMins > 0) {
      newNotifications.push({
        id: "balance-dsa-proj-skew",
        text: "You are spending significantly more time on DSA than projects. Balance your portfolio preparation.",
        type: "info",
        tag: "Suggested Focus"
      });
    }

    // C. Check Impending Deadlines (next 3 days)
    const threeDaysHence = new Date();
    threeDaysHence.setDate(threeDaysHence.getDate() + 3);
    const threeDaysHenceStr = threeDaysHence.toISOString().split("T")[0];

    goals.filter(g => !g.completed && g.deadline).forEach(g => {
      if (g.deadline <= threeDaysHenceStr && g.deadline >= todayStr) {
        newNotifications.push({
          id: `deadline-goal-${g.id}`,
          text: `Goal deadline "${g.title}" is approaching on ${g.deadline}.`,
          type: "danger",
          tag: "Goal Deadline Alert"
        });
      }
    });

    activeTracks.filter(t => t.deadline).forEach(t => {
      if (t.deadline <= threeDaysHenceStr && t.deadline >= todayStr) {
        newNotifications.push({
          id: `deadline-track-${t.id}`,
          text: `Track target deadline for "${t.title}" is in 3 days.`,
          type: "danger",
          tag: "Track Deadline Alert"
        });
      }
    });

    // D. Execution Slippage (Must Do incomplete from yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const yesterdayPlans = dailyPlans[yesterdayStr] || [];
    const incompleteMust = yesterdayPlans.filter(p => p.category === "must" && !p.completed);
    if (incompleteMust.length > 0) {
      newNotifications.push({
        id: "planner-slippage-yesterday",
        text: `You missed ${incompleteMust.length} high priority "Must Do" planner tasks yesterday. Re-evaluate your planning.`,
        type: "warning",
        tag: "Execution Slippage"
      });
    }

    setNotifications(newNotifications);
  }, [tracks, activityLogs, goals, dailyPlans]);

  const value = {
    settings, setSettings,
    tracks, setTracks,
    dailyPlans, setDailyPlans,
    goals, setGoals,
    activityLogs, setActivityLogs,
    distractions, setDistractions,
    notifications, setNotifications,

    // Timer details
    timerSeconds, setTimerSeconds,
    timerIsRunning, setTimerIsRunning,
    timerMode, setTimerMode,
    timerConfig, setTimerConfig,
    timerActivePlanId, setTimerActivePlanId,
    todayFocusSeconds, setTodayFocusSeconds,

    // Today dynamic goals checked state
    todayGoalsChecked, setTodayGoalsChecked,

    // Execution Center
    todayMission, setTodayMission,
    currentFocusTask, setCurrentFocusTask,
    dailyScoreHistory, setDailyScoreHistory,
    dailyReflections, setDailyReflections,
    dsaProblems, setDsaProblems,
    roadmaps, setRoadmaps,
    projects, setProjects
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);